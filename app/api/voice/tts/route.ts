import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// Venice TTS — default model tts-kokoro ($3.50/1M chars), default voice af_sky.
// Response is binary audio (mp3 by default). Proxy it back to the client.

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { text, voice = 'af_sky', speed = 1 } = await request.json()
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text required' }, { status: 400 })
    }

    // Venice caps input at 4096 chars; clip proactively
    const input = text.slice(0, 4096)

    const veniceApiKey = process.env.VENICE_API_KEY
    if (!veniceApiKey) {
      return NextResponse.json({ error: 'API configuration missing' }, { status: 500 })
    }

    const res = await fetch('https://api.venice.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${veniceApiKey}`,
      },
      body: JSON.stringify({
        input,
        model: 'tts-kokoro',
        voice,
        response_format: 'mp3',
        speed,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('Venice TTS error:', res.status, errorText)
      return NextResponse.json({ error: 'TTS failed' }, { status: res.status })
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer())

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('TTS route error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

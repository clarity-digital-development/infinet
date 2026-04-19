import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// Venice Speech-to-Text using nvidia/parakeet-tdt-0.6b-v3 default.
// Accepts multipart/form-data with a "file" field (webm recommended from MediaRecorder).

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const incomingForm = await request.formData()
    const file = incomingForm.get('file')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'file required' }, { status: 400 })
    }

    // Guard against zero-length audio (Venice returns 422)
    if (file.size < 1024) {
      return NextResponse.json({ error: 'Audio too short' }, { status: 400 })
    }

    const veniceApiKey = process.env.VENICE_API_KEY
    if (!veniceApiKey) {
      return NextResponse.json({ error: 'API configuration missing' }, { status: 500 })
    }

    // Forward to Venice — rebuild FormData so fetch sets the correct boundary
    const outgoingForm = new FormData()
    outgoingForm.append('file', file, (file as any).name || 'audio.webm')
    outgoingForm.append('model', 'nvidia/parakeet-tdt-0.6b-v3')
    outgoingForm.append('response_format', 'json')

    const res = await fetch('https://api.venice.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${veniceApiKey}`,
        // Do NOT set Content-Type — fetch handles multipart boundary
      },
      body: outgoingForm,
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('Venice STT error:', res.status, errorText)
      return NextResponse.json({ error: 'Transcription failed' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json({ text: data.text || '', duration: data.duration })
  } catch (error) {
    console.error('STT route error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

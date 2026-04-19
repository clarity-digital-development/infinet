import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

// Generate a concise 3–5 word title from the first user message.
// Uses a cheap, fast Venice call. Strips quotes and trailing punctuation.

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { message } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    const veniceApiKey = process.env.VENICE_API_KEY
    const veniceApiUrl = process.env.VENICE_API_URL
    if (!veniceApiKey || !veniceApiUrl) {
      return NextResponse.json({ error: 'API configuration missing' }, { status: 500 })
    }

    // Cap message length to keep cost predictable
    const snippet = message.slice(0, 500)

    const response = await fetch(veniceApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${veniceApiKey}`,
      },
      body: JSON.stringify({
        model: 'venice-uncensored',
        messages: [
          {
            role: 'system',
            content: 'You generate short chat titles. Respond with ONLY a 3-5 word title summarizing the user message. No quotes, no punctuation at the end, no prefixes like "Title:".',
          },
          { role: 'user', content: snippet },
        ],
        stream: false,
        temperature: 0.3,
        max_tokens: 20,
        venice_parameters: {
          include_venice_system_prompt: false,
        },
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ title: null }, { status: 200 })
    }

    const data = await response.json()
    let title = data.choices?.[0]?.message?.content?.trim() || ''
    // Clean up — strip quotes and trailing punctuation
    title = title.replace(/^["'"]+|["'"]+$/g, '').replace(/[.!?,:;]+$/, '').trim()
    // Cap at 60 chars
    if (title.length > 60) title = title.slice(0, 57) + '...'

    return NextResponse.json({ title: title || null })
  } catch (error) {
    console.error('Error generating title:', error)
    return NextResponse.json({ title: null }, { status: 200 })
  }
}

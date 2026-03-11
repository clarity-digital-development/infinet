'use client'

import { ChatInterface } from '@/components/chat/ChatInterface'
import { useChatStore } from '@/lib/store'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function ChatPage() {
  const { currentChatId, createChat, chats } = useChatStore()
  const [isInitialized, setIsInitialized] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Verify checkout session if returning from Stripe
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (!sessionId) return

    fetch('/api/verify-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log(`Subscription activated: ${data.tier}`)
        }
      })
      .catch(err => console.error('Checkout verification failed:', err))
      .finally(() => {
        // Remove session_id from URL
        router.replace('/chat')
      })
  }, [searchParams, router])

  useEffect(() => {
    // Create a new chat if none exists
    if (chats.length === 0 && !currentChatId) {
      createChat()
    }
    setIsInitialized(true)
  }, [chats.length, currentChatId, createChat])

  // Don't render until client-side initialization is complete
  if (!isInitialized) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    )
  }

  return <ChatInterface />
}
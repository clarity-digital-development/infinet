'use client'

import { ChatInterface } from '@/components/chat/ChatInterface'
import { useChatStore } from '@/lib/store'
import { useEffect, useState } from 'react'

export default function ChatPage() {
  const { currentChatId, createChat, chats } = useChatStore()
  const [isInitialized, setIsInitialized] = useState(false)

  // Verify checkout session if returning from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')

    // Also check sessionStorage in case the URL param was lost during auth redirect
    const storedSessionId = sessionStorage.getItem('pending_checkout_session')

    const checkoutId = sessionId || storedSessionId
    if (!checkoutId) return

    // Clear stored session
    sessionStorage.removeItem('pending_checkout_session')

    fetch('/api/verify-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: checkoutId }),
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
        if (sessionId) {
          window.history.replaceState({}, '', '/chat')
        }
      })
  }, [])

  useEffect(() => {
    if (chats.length === 0 && !currentChatId) {
      createChat()
    }
    setIsInitialized(true)
  }, [chats.length, currentChatId, createChat])

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

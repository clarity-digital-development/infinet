'use client'

import { ChatInterface } from '@/components/chat/ChatInterface'
import { useChatStore } from '@/lib/store'
import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'

export default function ChatPage() {
  const { currentChatId, createChat, chats } = useChatStore()
  const [isInitialized, setIsInitialized] = useState(false)
  const { toast } = useToast()

  // Show success toast when returning after subscription activation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('activated') === '1') {
      window.history.replaceState({}, '', '/chat')
      toast({
        title: 'Subscription Activated!',
        description: 'Your plan is now active. Enjoy Infinet!',
      })
    }
  }, [toast])

  // Verify checkout session if returning from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')

    // Also check sessionStorage in case the URL param was lost during auth redirect
    const storedSessionId = sessionStorage.getItem('pending_checkout_session')

    const checkoutId = sessionId || storedSessionId
    if (!checkoutId) return

    fetch('/api/verify-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: checkoutId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Only clear session after successful activation
          sessionStorage.removeItem('pending_checkout_session')
          console.log(`Subscription activated: ${data.tier}`)
          // Hard reload so subscription state is fresh from the database
          window.location.href = '/chat?activated=1'
        } else {
          console.error('Checkout verification failed:', data.error)
          window.history.replaceState({}, '', '/chat')
        }
      })
      .catch(err => {
        console.error('Checkout verification failed:', err)
        window.history.replaceState({}, '', '/chat')
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

'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Zap, Crown, AlertCircle, HelpCircle } from 'lucide-react'
import { SUBSCRIPTION_TIERS } from '@/lib/subscription-tiers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { loadStripe } from '@stripe/stripe-js'
import { useToast } from '@/hooks/use-toast'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function PricingPage() {
  const { isSignedIn, user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [showTokenInfo, setShowTokenInfo] = useState(false)
  const [currentTier, setCurrentTier] = useState<string | null>(null)

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/user/usage')
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) setCurrentTier(data.subscription.tier) })
        .catch(() => {})
    }
  }, [isSignedIn])

  const handleSubscribe = async (tierId: string) => {
    if (!isSignedIn) {
      router.push('/sign-in')
      return
    }

    // Block if they already have an active paid subscription
    if (currentTier && currentTier !== 'free') {
      toast({
        title: 'Already Subscribed',
        description: `You're already on the ${currentTier} plan. Manage your subscription from the Settings panel in the chat.`,
        variant: 'destructive',
      })
      return
    }

    setLoading(tierId)

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tierId }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create checkout session')
      }

      const { sessionId } = responseData

      const stripe = await stripePromise

      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      // Save session ID so it survives auth redirects after checkout
      sessionStorage.setItem('pending_checkout_session', sessionId)

      const { error } = await stripe.redirectToCheckout({ sessionId })

      if (error) {
        throw error
      }
    } catch (error: any) {
      console.error('Subscription error:', error)
      toast({
        title: 'Subscription Failed',
        description: error.message || 'Failed to process subscription. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground mb-2">
            Start free, then upgrade as you grow
          </p>
          <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
            <Check className="h-5 w-5" />
            <p className="font-semibold">New users get 500 free tokens every month</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-8">
          {Object.values(SUBSCRIPTION_TIERS).filter(tier => tier.id !== 'free').map((tier) => (
            <Card
              key={tier.id}
              className={`relative ${
                tier.popular ? 'border-primary shadow-lg scale-105' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  {tier.id === 'limitless' ? (
                    <Crown className="h-6 w-6 text-primary" />
                  ) : (
                    <Zap className="h-6 w-6 text-primary" />
                  )}
                </div>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-4">
                  {(tier.id === 'premium' || tier.id === 'limitless') && (
                    <span className="text-2xl line-through opacity-50 text-muted-foreground mr-2">
                      ${tier.id === 'premium' ? '100' : '300'}
                    </span>
                  )}
                  <span className="text-4xl font-bold">${tier.price}</span>
                  <span className="text-muted-foreground">/month</span>
                  {(tier.id === 'premium' || tier.id === 'limitless') && (
                    <span className="ml-2 text-sm text-green-600 dark:text-green-400 font-semibold">
                      Save ${tier.id === 'premium' ? '50' : '200'}!
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {tier.tokenLimit.toLocaleString()} tokens/month
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  variant={tier.popular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(tier.id)}
                  disabled={loading !== null}
                >
                  {loading === tier.id ? (
                    'Processing...'
                  ) : (
                    `Upgrade to ${tier.name}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => setShowTokenInfo(true)}
            className="gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            What are tokens?
          </Button>
        </div>

        <div className="mt-12 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Important Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>• New users get 500 free tokens every month</li>
                <li>• Upgrade anytime to access more tokens and features</li>
                <li>• Tokens do not roll over to the next month</li>
                <li>• Hard limit enforcement - no overage charges</li>
                <li>• All plans include priority support</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-muted-foreground">
          <p className="text-sm">
            All plans auto-renew monthly. Cancel anytime. No refunds for unused tokens.
          </p>
        </div>
      </div>

      <Dialog open={showTokenInfo} onOpenChange={setShowTokenInfo}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Understanding Tokens</DialogTitle>
            <DialogDescription>
              Tokens are the units we use to measure AI usage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <h3 className="font-semibold mb-2">What counts as tokens?</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Average message: ~100 tokens</li>
                <li>• Average AI response: ~150 tokens</li>
                <li>• Image generation: ~500 tokens</li>
                <li>• File upload processing: ~200 tokens</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Monthly allowances:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Starter (10,000 tokens): ~100 typical conversations</li>
                <li>• Premium (50,000 tokens): ~500 typical conversations</li>
                <li>• Limitless (100,000 tokens): ~1,000 typical conversations</li>
              </ul>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <p className="text-sm">
                <strong>Important:</strong> Once you reach your monthly limit, you cannot send
                any more messages until your next billing period or you upgrade your plan.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
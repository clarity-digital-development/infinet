import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe-config'
import { updateUserSubscription, getOrCreateUser } from '@/lib/database/db'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    if (session.status !== 'complete') {
      return NextResponse.json({ error: 'Checkout not complete' }, { status: 400 })
    }

    const subscription = session.subscription as import('stripe').Stripe.Subscription
    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 })
    }

    // Determine tier from price ID
    const priceId = subscription.items.data[0]?.price.id
    let tier: 'starter' | 'premium' | 'limitless' = 'starter'

    // Check against both env vars and hardcoded fallbacks
    const priceToTier: Record<string, 'starter' | 'premium' | 'limitless'> = {
      [STRIPE_PRICE_IDS.starter]: 'starter',
      [STRIPE_PRICE_IDS.premium]: 'premium',
      [STRIPE_PRICE_IDS.limitless]: 'limitless',
    }

    if (priceId && priceToTier[priceId]) {
      tier = priceToTier[priceId]
    }

    // Ensure user exists in DB
    const user = await getOrCreateUser(userId, session.customer_email || '')

    // Update subscription with all details
    await updateUserSubscription(userId, {
      subscription_tier: tier,
      subscription_status: 'active',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription.id,
      subscription_period_start: new Date((subscription as any).current_period_start * 1000),
      subscription_period_end: new Date((subscription as any).current_period_end * 1000),
    })

    console.log(`Checkout verified: user ${userId} → ${tier} tier (session ${sessionId})`)

    return NextResponse.json({
      success: true,
      tier,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        periodEnd: new Date((subscription as any).current_period_end * 1000),
      },
    })
  } catch (error) {
    console.error('Error verifying checkout:', error)
    return NextResponse.json(
      { error: 'Failed to verify checkout' },
      { status: 500 }
    )
  }
}

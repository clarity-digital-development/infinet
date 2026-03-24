import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserSubscription, getMonthlyUsage, updateUserSubscription } from '@/lib/database/db'
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe-config'
import { SUBSCRIPTION_TIERS } from '@/lib/subscription-tiers'
import { sql } from '@/lib/database/postgres-client'

const DEVELOPER_EMAILS = ['tannercarlson@vvsvault.com', 'tannerscarlson@gmail.com']

function getTokenLimit(tier: string): number {
  switch (tier) {
    case 'free': return 500
    case 'starter': return 10000
    case 'premium': return 50000
    case 'limitless': return 100000
    case 'trial': return 1000
    case 'developer': return Infinity
    default: return 500
  }
}

// Self-healing: if user is on free tier but has an active Stripe subscription, fix it
async function healSubscriptionIfNeeded(userId: string, subscription: any): Promise<any> {
  if (!subscription || subscription.tier !== 'free') return subscription
  if (!subscription.stripe_customer_id) return subscription

  try {
    const activeSubs = await stripe.subscriptions.list({
      customer: subscription.stripe_customer_id,
      status: 'active',
      limit: 1,
    })

    if (activeSubs.data.length === 0) return subscription

    const stripeSub = activeSubs.data[0]
    const priceId = stripeSub.items.data[0]?.price.id

    const priceToTier: Record<string, 'starter' | 'premium' | 'limitless'> = {
      [STRIPE_PRICE_IDS.starter]: 'starter',
      [STRIPE_PRICE_IDS.premium]: 'premium',
      [STRIPE_PRICE_IDS.limitless]: 'limitless',
    }

    const tier = (priceId && priceToTier[priceId]) || 'starter'
    const tokenLimit = SUBSCRIPTION_TIERS[tier]?.tokenLimit || 10000

    console.log(`Self-healing: user ${userId} has active Stripe sub but is on free tier. Fixing to ${tier}`)

    await updateUserSubscription(userId, {
      subscription_tier: tier,
      subscription_status: 'active',
      stripe_subscription_id: stripeSub.id,
      subscription_period_start: new Date((stripeSub as any).current_period_start * 1000),
      subscription_period_end: new Date((stripeSub as any).current_period_end * 1000),
    })

    // Wipe stale usage data so user starts fresh
    await sql`DELETE FROM token_usage WHERE user_id = ${userId}`
    await sql`DELETE FROM monthly_usage_cache WHERE user_id = ${userId}`

    // Return the corrected subscription
    return {
      ...subscription,
      tier,
      status: 'active',
      current_period_start: new Date((stripeSub as any).current_period_start * 1000),
      current_period_end: new Date((stripeSub as any).current_period_end * 1000),
    }
  } catch (error) {
    console.error('Self-healing check failed:', error)
    return subscription
  }
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let subscription = await getUserSubscription(userId)

    // Self-heal: check Stripe if user appears to be on free tier but has a customer ID
    subscription = await healSubscriptionIfNeeded(userId, subscription)

    const usage = await getMonthlyUsage(userId)

    const tier = subscription?.tier || 'free'
    const tokenLimit = getTokenLimit(tier)
    const tokensUsed = usage?.total_tokens || 0
    const tokensRemaining = Math.max(0, tokenLimit - tokensUsed)
    const percentUsed = tokenLimit === Infinity ? 0 : Math.round((tokensUsed / tokenLimit) * 100)

    return NextResponse.json({
      subscription: {
        tier,
        status: subscription?.status || 'active',
        periodStart: subscription?.current_period_start,
        periodEnd: subscription?.current_period_end,
      },
      usage: {
        tokensUsed,
        tokenLimit: tokenLimit === Infinity ? 'unlimited' : tokenLimit,
        tokensRemaining: tokenLimit === Infinity ? 'unlimited' : tokensRemaining,
        percentUsed,
        totalRequests: usage?.total_requests || 0,
      }
    })
  } catch (error) {
    console.error('Error fetching user usage:', error)
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }
}

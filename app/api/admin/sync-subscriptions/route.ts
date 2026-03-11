import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe-config'
import { updateUserSubscription, getUserByStripeCustomerId } from '@/lib/database/db'
import { sql } from '@/lib/database/postgres-client'

const ADMIN_EMAILS = ['tannercarlson@vvsvault.com', 'tannerscarlson@gmail.com']

const priceToTier: Record<string, 'starter' | 'premium' | 'limitless'> = {
  [STRIPE_PRICE_IDS.starter]: 'starter',
  [STRIPE_PRICE_IDS.premium]: 'premium',
  [STRIPE_PRICE_IDS.limitless]: 'limitless',
}

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await (await clerkClient()).users.getUser(userId)
    const userEmail = currentUser.emailAddresses[0]?.emailAddress
    if (!ADMIN_EMAILS.includes(userEmail || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all active subscriptions from Stripe
    const results: any[] = []
    let hasMore = true
    let startingAfter: string | undefined

    const allSubscriptions: import('stripe').Stripe.Subscription[] = []

    while (hasMore) {
      const params: any = { status: 'active', limit: 100, expand: ['data.customer'] }
      if (startingAfter) params.starting_after = startingAfter

      const subs = await stripe.subscriptions.list(params)
      allSubscriptions.push(...subs.data)
      hasMore = subs.has_more
      if (subs.data.length > 0) {
        startingAfter = subs.data[subs.data.length - 1].id
      }
    }

    for (const sub of allSubscriptions) {
      const customer = sub.customer as import('stripe').Stripe.Customer
      const priceId = sub.items.data[0]?.price.id
      const tier = priceToTier[priceId] || 'starter'
      const clerkUserId = customer.metadata?.userId

      let synced = false
      let method = ''

      if (clerkUserId) {
        // Ensure user exists in DB and update their subscription
        await sql`
          INSERT INTO users_subscription (
            user_id, tier, status, stripe_customer_id, stripe_subscription_id,
            current_period_start, current_period_end
          ) VALUES (
            ${clerkUserId}, ${tier}, 'active', ${customer.id}, ${sub.id},
            ${new Date((sub as any).current_period_start * 1000).toISOString()},
            ${new Date((sub as any).current_period_end * 1000).toISOString()}
          )
          ON CONFLICT (user_id) DO UPDATE SET
            tier = ${tier},
            status = 'active',
            stripe_customer_id = ${customer.id},
            stripe_subscription_id = ${sub.id},
            current_period_start = ${new Date((sub as any).current_period_start * 1000).toISOString()},
            current_period_end = ${new Date((sub as any).current_period_end * 1000).toISOString()},
            updated_at = CURRENT_TIMESTAMP
        `

        // Clear usage cache for recalculation
        await sql`DELETE FROM monthly_usage_cache WHERE user_id = ${clerkUserId}`

        synced = true
        method = 'clerk_metadata'
      }

      results.push({
        email: customer.email,
        customerId: customer.id,
        subscriptionId: sub.id,
        priceId,
        tier,
        clerkUserId: clerkUserId || 'NOT FOUND',
        synced,
        method,
        periodEnd: new Date((sub as any).current_period_end * 1000).toISOString(),
      })
    }

    const syncedCount = results.filter(r => r.synced).length
    const failedCount = results.filter(r => !r.synced).length

    return NextResponse.json({
      message: `Synced ${syncedCount} subscriptions, ${failedCount} failed`,
      totalStripeSubscriptions: allSubscriptions.length,
      results,
    })
  } catch (error) {
    console.error('Error syncing subscriptions:', error)
    return NextResponse.json({ error: 'Failed to sync subscriptions' }, { status: 500 })
  }
}

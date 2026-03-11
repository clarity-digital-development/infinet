import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { stripe, createStripeCustomer, createCheckoutSession, STRIPE_PRICE_IDS } from '@/lib/stripe-config'
import { SUBSCRIPTION_TIERS, TRIAL_CONFIG } from '@/lib/subscription-tiers'
import { getOrCreateUser, updateUserSubscription } from '@/lib/database/db'

export async function POST(request: NextRequest) {
  try {
    // Debug: Check if Stripe key exists
    console.log('Stripe key exists:', !!process.env.STRIPE_SECRET_KEY)
    console.log('Stripe key starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 7))

    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tierId, trial = false } = await request.json()

    if (!tierId || !SUBSCRIPTION_TIERS[tierId]) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      )
    }

    // Check if trial is enabled and user hasn't used it
    if (trial && (!TRIAL_CONFIG.enabled || !TRIAL_CONFIG.requiresPaymentMethod)) {
      return NextResponse.json(
        { error: 'Trial not available' },
        { status: 400 }
      )
    }

    const email = user.emailAddresses[0]?.emailAddress || ''

    // Get or create user in database (with fallback for invalid service key)
    let dbUser
    try {
      dbUser = await getOrCreateUser(userId, email)
    } catch (error) {
      console.error('Database error (check service role key):', error)
      // Continue without database for now
    }

    // Check if user already has an active Stripe subscription
    if (dbUser?.stripe_customer_id) {
      try {
        const existingSubs = await stripe.subscriptions.list({
          customer: dbUser.stripe_customer_id,
          status: 'active',
          limit: 1,
        })
        if (existingSubs.data.length > 0) {
          return NextResponse.json(
            { error: 'You already have an active subscription. Please manage it from Settings.' },
            { status: 400 }
          )
        }
      } catch (error) {
        // Continue if check fails
        console.error('Error checking existing subscriptions:', error)
      }
    }

    // Get or create Stripe customer
    let customerId: string

    // Check if we have a customer ID and if it exists in Stripe
    if (dbUser?.stripe_customer_id) {
      try {
        // Verify customer exists in current mode (live/test)
        await stripe.customers.retrieve(dbUser.stripe_customer_id)
        customerId = dbUser.stripe_customer_id
      } catch (error) {
        // Customer doesn't exist (probably from different mode), create new one
        console.log('Customer not found in current Stripe mode, creating new one')
        const customer = await createStripeCustomer(
          userId,
          email,
          `${user.firstName} ${user.lastName}`.trim() || undefined
        )
        customerId = customer.id

        // Update database if available
        if (dbUser) {
          try {
            await updateUserSubscription(dbUser.id, {
              stripe_customer_id: customerId,
            })
          } catch (error) {
            console.error('Failed to update user with new Stripe ID:', error)
          }
        }
      }
    } else {
      // No customer ID, create new customer
      const customer = await createStripeCustomer(
        userId,
        email,
        `${user.firstName} ${user.lastName}`.trim() || undefined
      )
      customerId = customer.id

      // Update user with Stripe customer ID if database is available
      if (dbUser) {
        try {
          await updateUserSubscription(dbUser.id, {
            stripe_customer_id: customerId,
          })
        } catch (error) {
          console.error('Failed to update user with Stripe ID:', error)
        }
      }
    }

    // Update customer metadata to include userId
    await stripe.customers.update(customerId, {
      metadata: {
        userId: userId,
      },
    })

    // Get the price ID for the selected tier
    const priceId = STRIPE_PRICE_IDS[tierId as keyof typeof STRIPE_PRICE_IDS]

    console.log('Creating checkout session with:', {
      tierId,
      priceId,
      customerId,
      trial,
      STRIPE_PRICE_IDS
    })

    if (!priceId || priceId === 'trial') {
      return NextResponse.json(
        { error: 'Invalid price configuration', tierId, priceId },
        { status: 500 }
      )
    }

    // Create checkout session
    const successUrl = `${request.headers.get('origin')}/chat?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${request.headers.get('origin')}/pricing`

    const session = await createCheckoutSession(
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      trial && TRIAL_CONFIG.enabled
    )

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Subscribe API error:', error)

    // More detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)

    return NextResponse.json(
      { error: 'Failed to create subscription session', details: errorMessage },
      { status: 500 }
    )
  }
}
import Stripe from 'stripe'

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey) {
  console.error('STRIPE_SECRET_KEY is not set in environment variables')
}

export const stripe = new Stripe(stripeKey || '', {
  apiVersion: '2025-08-27.basil',
})

// Stripe Price IDs (live mode)
export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID || 'price_1S8B4gQgllS64VYRe0g9TqkE',
  premium: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_1S8B4gQgllS64VYRZSRVK0TN',
  limitless: process.env.STRIPE_LIMITLESS_PRICE_ID || 'price_1S8B4gQgllS64VYR4BIYL0jC',
  trial: 'trial', // No price ID for trial
}

// Stripe webhook events we handle
export const STRIPE_WEBHOOK_EVENTS = {
  CHECKOUT_COMPLETED: 'checkout.session.completed',
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  PAYMENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_FAILED: 'payment_intent.payment_failed',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  TRIAL_WILL_END: 'customer.subscription.trial_will_end',
}

// Create Stripe customer
export async function createStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    })
    return customer
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw error
  }
}

// Create subscription
export async function createSubscription(
  customerId: string,
  priceId: string,
  trial = false
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      ...(trial && {
        trial_period_days: 3,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel',
          },
        },
      }),
    })
    return subscription
  } catch (error) {
    console.error('Error creating subscription:', error)
    throw error
  }
}

// Update subscription (upgrade/downgrade)
export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string,
  prorationBehavior: 'create_prorations' | 'none' = 'create_prorations'
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: prorationBehavior,
    })
    return updatedSubscription
  } catch (error) {
    console.error('Error updating subscription:', error)
    throw error
  }
}

// Cancel subscription
export async function cancelSubscription(
  subscriptionId: string,
  immediately = true
): Promise<Stripe.Subscription> {
  try {
    if (immediately) {
      return await stripe.subscriptions.cancel(subscriptionId)
    } else {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })
    }
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

// Get subscription
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId)
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return null
  }
}

// Create payment intent for one-time payment
export async function createPaymentIntent(
  amount: number,
  customerId: string,
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      customer: customerId,
      metadata,
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw error
  }
}

// Create checkout session
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  trial = false
): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(trial && {
        subscription_data: {
          trial_period_days: 3,
        },
      }),
    })
    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    console.error('Details:', {
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      trial
    })
    throw error
  }
}

// Create customer portal session
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  try {
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
  } catch (error) {
    console.error('Error creating portal session:', error)
    throw error
  }
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw error
  }
}

// Get customer by ID
export async function getCustomer(customerId: string): Promise<Stripe.Customer | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    if (customer.deleted) return null
    return customer as Stripe.Customer
  } catch (error) {
    console.error('Error fetching customer:', error)
    return null
  }
}

// Get payment methods for customer
export async function getPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })
    return paymentMethods.data
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return []
  }
}

// Calculate proration for upgrade
export async function calculateProration(
  subscriptionId: string,
  newPriceId: string
): Promise<number> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    // Using createPreview for the new API
    const preview = await stripe.invoices.createPreview({
      customer: subscription.customer as string,
      subscription: subscriptionId,
      subscription_details: {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      },
    })

    return preview.amount_due / 100 // Convert from cents
  } catch (error) {
    console.error('Error calculating proration:', error)
    return 0
  }
}
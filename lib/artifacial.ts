import { stripe } from './stripe-config'

const ARTIFACIAL_URL = process.env.ARTIFACIAL_URL || 'https://artifacial.io'

// Comma-separated list of artifacial Stripe price IDs.
// Set ARTIFACIAL_PRICE_IDS in Railway when ready.
// e.g. "price_xxx,price_yyy,price_zzz"
const ARTIFACIAL_PRICE_IDS = (process.env.ARTIFACIAL_PRICE_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

// Check if the user (by email) has an active artifacial.io subscription
// via the shared Stripe account.
export async function hasArtifacialSubscription(email: string): Promise<boolean> {
  if (!email || ARTIFACIAL_PRICE_IDS.length === 0) return false

  try {
    const customers = await stripe.customers.list({ email, limit: 10 })
    if (customers.data.length === 0) return false

    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 20,
      })
      for (const sub of subs.data) {
        for (const item of sub.items.data) {
          if (ARTIFACIAL_PRICE_IDS.includes(item.price.id)) return true
        }
      }
    }
    return false
  } catch (error) {
    console.error('Error checking artifacial subscription:', error)
    return false
  }
}

export function buildArtifacialUrl(prompt: string, isSubscriber: boolean): string {
  const base = isSubscriber ? `${ARTIFACIAL_URL}/generate` : ARTIFACIAL_URL
  const params = new URLSearchParams({ prompt, ref: 'infinet' })
  return `${base}?${params.toString()}`
}

export function buildHandoffMarkdown(prompt: string, isSubscriber: boolean): string {
  const url = buildArtifacialUrl(prompt, isSubscriber)

  if (isSubscriber) {
    return `### You're already an artifacial.io subscriber

Image and video generation lives on **artifacial.io** — our sister product focused on unrestricted visual creation.

We've pre-filled your prompt:

> ${prompt}

**[Open in artifacial.io →](${url})**`
  }

  return `### Image generation isn't available in Infinet

Infinet is focused on text. For unrestricted image and video generation, check out our sister product **artifacial.io** — same team, same "no filters" philosophy, built specifically for visual creation.

**[Try artifacial.io →](${url})**

We've pre-filled your prompt so you can pick up right where you left off.`
}

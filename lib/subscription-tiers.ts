export interface SubscriptionTier {
  id: string
  name: string
  price: number
  priceId?: string // Stripe price ID
  tokenLimit: number
  requestsPerDay: number
  features: string[]
  description: string
  popular?: boolean
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    tokenLimit: 500,
    requestsPerDay: 10,
    features: [
      '500 tokens per month',
      '10 requests per day',
      'Text chat',
      'Community support',
    ],
    description: 'Get started with Infinet for free',
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 10,
    tokenLimit: 10000,
    requestsPerDay: 30,
    features: [
      '10,000 tokens per month',
      '30 requests per day',
      'Text chat + file uploads',
      'Community support',
    ],
    description: 'Great for trying out Infinet',
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 50,
    tokenLimit: 50000,
    requestsPerDay: 60,
    features: [
      '50,000 tokens per month',
      '60 requests per day',
      'Model selection (choose between models)',
      'Extended reasoning on supported models',
      'Email support',
    ],
    description: 'Perfect for individuals and small teams',
    popular: true,
  },
  limitless: {
    id: 'limitless',
    name: 'Limitless',
    price: 150,
    tokenLimit: 100000,
    requestsPerDay: -1, // Unlimited
    features: [
      '100,000 tokens per month',
      'Unlimited requests per day',
      'Priority model routing (faster/best models)',
      'Priority email support',
      'All features from Premium',
    ],
    description: 'For power users and businesses',
  },
}

// Trial configuration (optional)
export const TRIAL_CONFIG = {
  enabled: true,
  duration: 3, // days
  tokenLimit: 1000,
  requiresPaymentMethod: true,
}

// Token calculation helpers
export const TOKEN_ESTIMATES = {
  averageMessageTokens: 100,
  averageResponseTokens: 150,
  imageGenerationTokens: 500,
  fileUploadTokens: 200,
}

// Calculate cost per token for display
export function calculateTokenCost(tier: SubscriptionTier): number {
  return tier.price / tier.tokenLimit
}

// Estimate tokens for a message
export function estimateTokens(message: string, includesImage = false): number {
  // Better estimation based on word count for typical messages
  const words = message.split(/\s+/).length
  const chars = message.length

  let textTokens: number
  if (chars < 1000) {
    // Use word count for shorter texts (more accurate)
    // Approximately 0.75 tokens per word
    textTokens = Math.ceil(words * 0.75)
  } else {
    // For longer texts, use character count
    textTokens = Math.ceil(chars / 4)
  }

  const imageTokens = includesImage ? TOKEN_ESTIMATES.imageGenerationTokens : 0
  return textTokens + imageTokens
}

// Calculate remaining days in billing period
export function daysUntilReset(periodEnd: Date): number {
  const now = new Date()
  const diff = periodEnd.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// Check if user is approaching limit
export function getUsageStatus(used: number, limit: number): {
  percentage: number
  status: 'safe' | 'warning' | 'critical' | 'exceeded'
  color: string
} {
  const percentage = (used / limit) * 100

  if (percentage >= 100) {
    return { percentage: 100, status: 'exceeded', color: 'red' }
  } else if (percentage >= 95) {
    return { percentage, status: 'critical', color: 'red' }
  } else if (percentage >= 80) {
    return { percentage, status: 'warning', color: 'yellow' }
  } else {
    return { percentage, status: 'safe', color: 'green' }
  }
}

// Format token count for display
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`
  }
  return tokens.toString()
}

// Calculate daily recommended pace
export function calculateRecommendedPace(
  limit: number,
  daysInPeriod: number
): number {
  return Math.floor(limit / daysInPeriod)
}

// Warning thresholds
export const WARNING_THRESHOLDS = {
  soft: 0.8, // 80% - yellow warning
  medium: 0.9, // 90% - orange warning
  hard: 0.95, // 95% - red warning
  exceeded: 1.0, // 100% - blocked
}
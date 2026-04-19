// Infinet's curated model roster with tier-based access.
//
// Model selection is a Premium+ feature; Free and Starter users always
// get the default model. Limitless gets priority routing (first pick
// when capacity allows).

export interface ModelConfig {
  id: string           // Venice model ID passed in the API request
  label: string        // User-facing name
  description: string  // Short tagline shown in the picker
  minTier: 'free' | 'starter' | 'premium' | 'limitless'
  supportsVision?: boolean
  supportsReasoning?: boolean
  priority?: boolean   // Limitless users get these routed first
}

export const MODELS: ModelConfig[] = [
  {
    id: 'venice-uncensored',
    label: 'Infinet Default',
    description: 'Fast, unfiltered chat. Good for most conversations.',
    minTier: 'free',
  },
  {
    id: 'olafangensan-glm-4.7-flash-heretic',
    label: 'GLM 4.7 Flash',
    description: 'Long-context (128K) alternative with solid reasoning.',
    minTier: 'free',
  },
  {
    id: 'qwen3-vl-235b-a22b',
    label: 'Qwen3-VL (Vision)',
    description: 'Multimodal model — can analyze images you upload.',
    minTier: 'premium',
    supportsVision: true,
  },
  {
    id: 'deepseek-v3.2',
    label: 'DeepSeek V3.2',
    description: 'Strong coding and tool-use performance.',
    minTier: 'premium',
    supportsReasoning: true,
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    description: 'Extended reasoning. 1M context. Best for complex tasks.',
    minTier: 'limitless',
    supportsReasoning: true,
    priority: true,
  },
]

const TIER_RANK: Record<string, number> = {
  free: 0,
  trial: 0,
  starter: 1,
  premium: 2,
  limitless: 3,
  developer: 4,
}

export function getAvailableModels(tier: string): ModelConfig[] {
  const userRank = TIER_RANK[tier] ?? 0
  return MODELS.filter(m => (TIER_RANK[m.minTier] ?? 99) <= userRank)
}

export function isModelAllowed(modelId: string, tier: string): boolean {
  const model = MODELS.find(m => m.id === modelId)
  if (!model) return false
  const userRank = TIER_RANK[tier] ?? 0
  const needed = TIER_RANK[model.minTier] ?? 99
  return userRank >= needed
}

// Given a requested model (or nothing) and user tier, return an ordered
// fallback list. Limitless users get priority models pushed to the front.
export function resolveModelChain(requestedModel: string | undefined, tier: string): string[] {
  const defaultChain = ['venice-uncensored', 'olafangensan-glm-4.7-flash-heretic']

  if (requestedModel && isModelAllowed(requestedModel, tier)) {
    // User-requested model first, then default fallbacks
    const chain = [requestedModel, ...defaultChain.filter(m => m !== requestedModel)]
    return chain
  }

  // Limitless gets priority models bumped to front
  if (tier === 'limitless' || tier === 'developer') {
    const priorityModels = MODELS.filter(m => m.priority).map(m => m.id)
    return [...priorityModels, ...defaultChain]
  }

  return defaultChain
}

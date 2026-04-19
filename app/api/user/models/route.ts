import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserSubscription } from '@/lib/database/db'
import { getAvailableModels } from '@/lib/models'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await getUserSubscription(userId)
    const tier = subscription?.tier || 'free'
    const models = getAvailableModels(tier)

    return NextResponse.json({
      tier,
      models: models.map(m => ({
        id: m.id,
        label: m.label,
        description: m.description,
        supportsVision: m.supportsVision || false,
        supportsReasoning: m.supportsReasoning || false,
      })),
    })
  } catch (error) {
    console.error('Error fetching user models:', error)
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 })
  }
}

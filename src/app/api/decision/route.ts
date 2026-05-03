import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { callClaude, extractJSON } from '@/lib/claude'
import { DECISION_SYSTEM, buildDecisionPrompt } from '@/lib/prompts/decision'
import type { AnalyseResult, VisiteData, ContactVerdict, DecisionFinale } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { analyse, visite, contactVerdict } = body as {
      analyse: AnalyseResult
      visite?: VisiteData
      contactVerdict?: ContactVerdict
    }

    if (!analyse) {
      return NextResponse.json({ error: 'Données analyse manquantes' }, { status: 400 })
    }

    const text = await callClaude(
      buildDecisionPrompt(analyse, visite, contactVerdict),
      DECISION_SYSTEM,
      2000
    )
    const result = extractJSON<DecisionFinale>(text)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API /decision]', error)
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

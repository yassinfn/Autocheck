import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { callClaude, callClaudeVision, extractJSON } from '@/lib/claude'
import { VISITE_SYSTEM, buildChecklistPrompt, buildPhotoPrompt, buildScenarioPrompt } from '@/lib/prompts/visite'
import { getUniversalSteps, detectMotorisation, applyEnrichments } from '@/lib/universalSteps'
import type { AnalyseResult, ChecklistGeneratedResult, ScenarioResult, VisiteStep } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, analyse, imageData, mimeType } = body as {
      action: 'checklist' | 'scenario' | 'photo'
      analyse?: AnalyseResult
      imageData?: string
      mimeType?: string
    }

    if (action === 'scenario') {
      if (!analyse) {
        return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
      }
      const motorisationType = detectMotorisation(analyse.vehicule.motorisation)
      const universalSteps = getUniversalSteps(motorisationType)
      const universalIds = universalSteps.map(s => s.id)

      const text = await callClaude(buildScenarioPrompt(analyse, universalIds), VISITE_SYSTEM, 3500)

      type RawResponse = {
        enrichissements?: Record<string, string>
        steps_specifiques?: unknown[]
      }
      const raw = extractJSON<RawResponse>(text)
      const enrichissements: Record<string, string> = raw.enrichissements ?? {}
      const stepsSpecifiques: VisiteStep[] = (Array.isArray(raw.steps_specifiques) ? raw.steps_specifiques : [])
        .map((s) => {
          const step = s as Partial<VisiteStep>
          return {
            ...step,
            niveau: (step.niveau === 1 || step.niveau === 2) ? step.niveau : 2,
            quoi_chercher: Array.isArray(step.quoi_chercher) ? step.quoi_chercher : [],
          } as VisiteStep
        })

      const enrichedUniversals = applyEnrichments(universalSteps, enrichissements)
      const allSteps: VisiteStep[] = [...enrichedUniversals, ...stepsSpecifiques]
        .sort((a, b) => (a.niveau ?? 1) - (b.niveau ?? 1))

      const result: ScenarioResult = { steps: allSteps }
      return NextResponse.json(result)
    }

    if (action === 'checklist') {
      if (!analyse) {
        return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
      }
      const text = await callClaude(buildChecklistPrompt(analyse), VISITE_SYSTEM, 4000)
      const result = extractJSON<ChecklistGeneratedResult>(text)
      return NextResponse.json(result)
    }

    if (action === 'photo') {
      if (!imageData) {
        return NextResponse.json({ error: 'Image manquante' }, { status: 400 })
      }
      const validMime = (mimeType || 'image/jpeg') as
        | 'image/jpeg'
        | 'image/png'
        | 'image/gif'
        | 'image/webp'
      const analysis = await callClaudeVision(imageData, validMime, buildPhotoPrompt(), 400)
      return NextResponse.json({ analysis })
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  } catch (error) {
    console.error('[API /visite]', error)
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

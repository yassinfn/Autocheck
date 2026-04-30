import { NextRequest, NextResponse } from 'next/server'
import { callClaude, callClaudeVision, extractJSON } from '@/lib/claude'
import { VISITE_SYSTEM, buildChecklistPrompt, buildPhotoPrompt, buildScenarioPrompt } from '@/lib/prompts/visite'
import type { AnalyseResult, ChecklistGeneratedResult, ScenarioResult } from '@/types'

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
      const text = await callClaude(buildScenarioPrompt(analyse), VISITE_SYSTEM, 6000)
      const result = extractJSON<ScenarioResult>(text)
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

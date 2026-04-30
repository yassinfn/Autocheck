import { NextRequest, NextResponse } from 'next/server'
import { callClaude, callClaudeVision, extractJSON } from '@/lib/claude'
import { CONTACT_SYSTEM, buildContactQuestionsPrompt, buildContactAnalysePrompt } from '@/lib/prompts/contact'
import type { AnalyseResult, ContactQuestionsResult, ContactVerdict } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, analyse, reponses, images, annonce } = body as {
      action: 'questions' | 'analyse'
      analyse: AnalyseResult
      reponses?: string
      images?: { data: string; mimeType: string }[]
      annonce?: string
    }

    if (!analyse) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    if (action === 'questions') {
      const text = await callClaude(buildContactQuestionsPrompt(analyse, annonce), CONTACT_SYSTEM, 1500)
      const result = extractJSON<ContactQuestionsResult>(text)
      return NextResponse.json(result)
    }

    if (action === 'analyse') {
      if (!reponses?.trim()) {
        return NextResponse.json({ error: 'Réponses manquantes' }, { status: 400 })
      }

      let fullReponses = reponses

      // Extract text from documents via Vision if any
      if (images && images.length > 0) {
        const docPrompt = `Extrais toutes les informations importantes de ce document (contrôle technique, facture, carnet d'entretien, photo véhicule, etc.). Réponds en texte simple et concis.`
        const docTexts = await Promise.all(
          images.map(img =>
            callClaudeVision(
              img.data,
              img.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              docPrompt,
              600
            ).catch(() => '')
          )
        )
        const docs = docTexts.filter(Boolean).join('\n\n---\n\n')
        if (docs) fullReponses = `${reponses}\n\n[Documents joints analysés]\n${docs}`
      }

      const text = await callClaude(buildContactAnalysePrompt(analyse, fullReponses), CONTACT_SYSTEM, 2000)
      const result = extractJSON<ContactVerdict>(text)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  } catch (error) {
    console.error('[API /contact]', error)
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

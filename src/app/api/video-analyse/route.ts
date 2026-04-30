import { NextRequest, NextResponse } from 'next/server'
import { callClaudeVisionMulti, extractJSON } from '@/lib/claude'
import { buildVideoAnalysePrompt } from '@/lib/prompts/visite'
import type { VideoAnalyseResult } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { frames, audioDescription, langue } = body as {
      frames: { data: string; mediaType: 'image/jpeg' }[]
      audioDescription: string
      langue: string
    }

    if (!frames || frames.length === 0) {
      return NextResponse.json({ error: 'Frames manquantes' }, { status: 400 })
    }

    const prompt = buildVideoAnalysePrompt(audioDescription || 'Non disponible', langue || 'français', frames.length)
    const text = await callClaudeVisionMulti(frames, prompt, 1500)
    const result = extractJSON<VideoAnalyseResult>(text)
    result.analyse_date = new Date().toISOString()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API /video-analyse]', error)
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

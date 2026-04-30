import { NextRequest, NextResponse } from 'next/server'
import { callClaude, callClaudeVision, extractJSON } from '@/lib/claude'
import { supabase } from '@/lib/supabase'
import {
  ANALYSE_SYSTEM,
  buildAnalysePrompt,
  buildReputationPrompt,
} from '@/lib/prompts/analyse'
import type { AnalyseResult, ReputationResult, HistoryData } from '@/types'

type AnalyseWithoutReputation = Omit<AnalyseResult, 'reputation'>

function buildCacheKey(data: AnalyseWithoutReputation): string {
  const { marque, modele, version, annee, motorisation, boite } = data.vehicule
  const { pays } = data.detection
  return [marque, modele, version, annee, motorisation, boite, pays]
    .map(v => String(v).toLowerCase().trim().replace(/\s+/g, '-'))
    .join('_')
}

async function getReputationFromCache(cacheKey: string): Promise<ReputationResult | null> {
  try {
    const { data } = await supabase
      .from('reputation_cache')
      .select('data')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single()
    return (data?.data as ReputationResult) ?? null
  } catch {
    return null
  }
}

async function saveReputationToCache(cacheKey: string, data: ReputationResult): Promise<void> {
  try {
    await supabase.from('reputation_cache').upsert(
      {
        cache_key: cacheKey,
        data,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'cache_key' }
    )
  } catch (e) {
    console.error('[Reputation cache save]', e)
  }
}

async function getReputation(
  analyseData: AnalyseWithoutReputation,
  annonceText: string
): Promise<ReputationResult> {
  const cacheKey = buildCacheKey(analyseData)
  const cached = await getReputationFromCache(cacheKey)
  if (cached) return cached

  const reputationText = await callClaude(
    buildReputationPrompt(annonceText),
    ANALYSE_SYSTEM,
    2000
  )
  const reputationData = extractJSON<ReputationResult>(reputationText)
  await saveReputationToCache(cacheKey, reputationData)
  return reputationData
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { annonce, type, imageData, mimeType, historyData } = body as {
      annonce?: string
      type?: string
      imageData?: string
      mimeType?: string
      historyData?: HistoryData
    }

    if (!annonce && !imageData) {
      return NextResponse.json({ error: 'Contenu manquant' }, { status: 400 })
    }

    let analyseData: AnalyseWithoutReputation
    let reputationData: ReputationResult

    if (type === 'image' && imageData) {
      const validMime = (mimeType || 'image/jpeg') as
        | 'image/jpeg'
        | 'image/png'
        | 'image/gif'
        | 'image/webp'
      const analyseText = await callClaudeVision(
        imageData,
        validMime,
        buildAnalysePrompt('(Annonce en image — extrais toutes les informations visibles)'),
        4000
      )
      analyseData = extractJSON<AnalyseWithoutReputation>(analyseText)

      const syntheticAnnonce = `${analyseData.vehicule.marque} ${analyseData.vehicule.modele} ${analyseData.vehicule.version} ${analyseData.vehicule.annee} ${analyseData.vehicule.motorisation} ${analyseData.vehicule.boite} (${analyseData.detection.pays})`
      reputationData = await getReputation(analyseData, syntheticAnnonce)
    } else {
      const analyseText = await callClaude(
        buildAnalysePrompt(annonce!, historyData),
        ANALYSE_SYSTEM,
        4000
      )
      analyseData = extractJSON<AnalyseWithoutReputation>(analyseText)
      reputationData = await getReputation(analyseData, annonce!)
    }

    const result: AnalyseResult = { ...analyseData, reputation: reputationData }
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API /analyse]', error)
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

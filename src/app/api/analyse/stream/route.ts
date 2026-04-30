import { NextRequest } from 'next/server'
import { callClaude, callClaudeVision, extractJSON } from '@/lib/claude'
import { supabase } from '@/lib/supabase'
import { ANALYSE_SYSTEM, buildAnalysePrompt, buildReputationPrompt } from '@/lib/prompts/analyse'
import type { AnalyseResult, ReputationResult, HistoryData } from '@/types'

type WithoutReputation = Omit<AnalyseResult, 'reputation'>

function buildCacheKey(data: WithoutReputation): string {
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

function saveReputationToCache(cacheKey: string, data: ReputationResult): void {
  supabase
    .from('reputation_cache')
    .upsert(
      {
        cache_key: cacheKey,
        data,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'cache_key' }
    )
    .then(({ error }) => {
      if (error) console.error('[Reputation cache save]', error.message)
    })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { annonce, type, imageData, mimeType, historyData } = body as {
    annonce?: string
    type?: string
    imageData?: string
    mimeType?: string
    historyData?: HistoryData
  }

  const encoder = new TextEncoder()

  function send(controller: ReadableStreamDefaultController, obj: object) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let analyseData: WithoutReputation
        let annonceText: string

        if (type === 'image' && imageData) {
          const validMime = (mimeType || 'image/jpeg') as
            | 'image/jpeg'
            | 'image/png'
            | 'image/gif'
            | 'image/webp'
          const text = await callClaudeVision(
            imageData,
            validMime,
            buildAnalysePrompt('(Annonce en image — extrais toutes les informations visibles)'),
            4000
          )
          analyseData = extractJSON<WithoutReputation>(text)
          annonceText = `${analyseData.vehicule.marque} ${analyseData.vehicule.modele} ${analyseData.vehicule.version} ${analyseData.vehicule.annee} ${analyseData.vehicule.motorisation} ${analyseData.vehicule.boite} (${analyseData.detection.pays})`
        } else {
          const text = await callClaude(
            buildAnalysePrompt(annonce!, historyData),
            ANALYSE_SYSTEM,
            4000
          )
          analyseData = extractJSON<WithoutReputation>(text)
          annonceText = annonce!
        }

        // First event — score, vehicule, depenses (immediately available)
        send(controller, { type: 'score', payload: analyseData })

        // Second event — reputation (cache hit = instant, miss = 1 more Claude call)
        const cacheKey = buildCacheKey(analyseData)
        let reputationData = await getReputationFromCache(cacheKey)
        if (!reputationData) {
          const repText = await callClaude(buildReputationPrompt(annonceText), ANALYSE_SYSTEM, 2000)
          reputationData = extractJSON<ReputationResult>(repText)
          saveReputationToCache(cacheKey, reputationData)
        }

        send(controller, { type: 'reputation', payload: reputationData })
        send(controller, { type: 'done' })
      } catch (err) {
        send(controller, {
          type: 'error',
          payload: { message: err instanceof Error ? err.message : 'Erreur inconnue' },
        })
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

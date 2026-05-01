import { NextRequest } from 'next/server'
import { callClaude, callClaudeVision, extractJSON } from '@/lib/claude'
import { supabase } from '@/lib/supabase'
import { ANALYSE_SYSTEM, buildAnalysePrompt, buildReputationPrompt } from '@/lib/prompts/analyse'
import type { AnalyseResult, ReputationResult, HistoryData } from '@/types'

function detectCountryFromUrl(url: string): string | null {
  const domainCountryMap: Record<string, string> = {
    'leboncoin.fr': 'France',
    'lacentrale.fr': 'France',
    'paruvendu.fr': 'France',
    'autoscout24.fr': 'France',
    'largus.fr': 'France',
    'cargurus.ca': 'Canada',
    'autotrader.ca': 'Canada',
    'kijiji.ca': 'Canada',
    'cargurus.com': 'USA',
    'cars.com': 'USA',
    'autotrader.com': 'USA',
    'autotrader.co.uk': 'UK',
    'gumtree.com': 'UK',
    'mobile.de': 'Germany',
    'autoscout24.de': 'Germany',
    'coches.net': 'Spain',
    'milanuncios.com': 'Spain',
    'autoscout24.es': 'Spain',
    'subito.it': 'Italy',
    'autoscout24.it': 'Italy',
    'standvirtual.com': 'Portugal',
    'custojusto.pt': 'Portugal',
    'autoscout24.be': 'Belgium',
    'avito.ma': 'Morocco',
    'dubizzle.com': 'UAE',
  }
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    for (const [domain, country] of Object.entries(domainCountryMap)) {
      if (hostname.includes(domain)) return country
    }
  } catch {}
  return null
}

function detectLanguageFromText(text: string): string {
  const t = text.toLowerCase()
  const scores: Record<string, number> = { fr: 0, en: 0, es: 0, pt: 0, it: 0, de: 0 }
  const keywords: Record<string, string[]> = {
    fr: ['voiture', 'kilomètre', 'kilométrage', 'boîte', 'essence', 'occasion', 'propriétaire', 'vente', 'prix', 'marque', 'modèle', 'année', 'chevaux', 'puissance', 'carrosserie'],
    en: ['mileage', 'gearbox', 'petrol', 'used', 'owner', 'sale', 'price', 'make', 'model', 'year', 'horsepower', 'transmission', 'registration'],
    es: ['kilómetros', 'caja', 'gasolina', 'ocasión', 'propietario', 'venta', 'precio', 'marca', 'modelo', 'año', 'caballos', 'carrocería'],
    pt: ['quilómetros', 'caixa', 'gasolina', 'usado', 'proprietário', 'venda', 'preço', 'marca', 'modelo', 'ano', 'cavalos'],
    it: ['chilometri', 'cambio', 'benzina', 'usato', 'proprietario', 'vendita', 'prezzo', 'marca', 'modello', 'anno', 'cavalli', 'carrozzeria'],
    de: ['kilometerstand', 'getriebe', 'benzin', 'gebraucht', 'eigentümer', 'verkauf', 'preis', 'marke', 'modell', 'baujahr', 'karosserie'],
  }
  for (const [lang, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (t.includes(word)) scores[lang]++
    }
  }
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
}

function langToCountry(lang: string): string {
  const map: Record<string, string> = {
    fr: 'France', en: 'United Kingdom', es: 'Spain',
    pt: 'Portugal', it: 'Italy', de: 'Germany', nl: 'Netherlands',
  }
  return map[lang] ?? 'France'
}

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
  const { annonce, type, imageData, mimeType, historyData, sourceUrl } = body as {
    annonce?: string
    type?: string
    imageData?: string
    mimeType?: string
    historyData?: HistoryData
    sourceUrl?: string
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
          const detectedCountry =
            (sourceUrl && detectCountryFromUrl(sourceUrl)) ||
            langToCountry(detectLanguageFromText(annonce!))
          const textWithHint = `[HINT: This listing appears to be from ${detectedCountry}. Respond entirely in the language of that country.]\n\n${annonce!}`
          const prompt = buildAnalysePrompt(textWithHint, historyData)

          // Stream tokens directly from Anthropic → forward chunks to client
          // so the user sees progress instead of a 40-60s blank spinner
          const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.ANTHROPIC_API_KEY!,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-6',
              max_tokens: 4000,
              stream: true,
              system: ANALYSE_SYSTEM,
              messages: [{ role: 'user', content: prompt }],
            }),
          })

          if (!claudeRes.ok || !claudeRes.body) {
            throw new Error(`Anthropic streaming error: ${claudeRes.status}`)
          }

          let fullText = ''
          const claudeReader = claudeRes.body.getReader()
          const claudeDec = new TextDecoder()
          let claudeBuffer = ''

          while (true) {
            const { done, value } = await claudeReader.read()
            if (done) break
            claudeBuffer += claudeDec.decode(value, { stream: true })
            const lines = claudeBuffer.split('\n')
            claudeBuffer = lines.pop() ?? ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const raw = line.slice(6).trim()
              if (!raw || raw === '[DONE]') continue
              try {
                const evt = JSON.parse(raw)
                if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                  fullText += evt.delta.text
                  send(controller, { type: 'chunk', payload: evt.delta.text })
                }
              } catch {}
            }
          }

          analyseData = extractJSON<WithoutReputation>(fullText)
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

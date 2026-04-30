import { NextRequest, NextResponse } from 'next/server'
import type { HistoryData, KmReleve } from '@/types'

const SCRAPE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function findAutovizaUrl(html: string): string | null {
  const urlMatch = html.match(/https?:\/\/(?:www\.)?autoviza\.fr\/report[^\s"'<>&]*/i)
  if (urlMatch) return urlMatch[0]
  const pathMatch = html.match(/autoviza\.fr\/report\/([A-Z0-9-]+)/i)
  if (pathMatch) return `https://www.autoviza.fr/report/${pathMatch[1]}`
  return null
}

function parseAutovizaData(text: string): HistoryData {
  const resume = text.slice(0, 3000)

  const propMatch = text.match(/(\d+)\s*propriétaire/i)
  const proprietaires = propMatch ? parseInt(propMatch[1]) : undefined

  const relevesKm: KmReleve[] = []
  const kmPattern =
    /(\d[\d\s]{1,8})\s*km[\s\S]{0,60}?(\d{2}[/\-]\d{2}[/\-]\d{2,4}|\d{2}[/\-]\d{4}|\w+\.?\s+\d{4}|\d{4})/gi
  let kmMatch
  while ((kmMatch = kmPattern.exec(text)) !== null && relevesKm.length < 15) {
    const km = parseInt(kmMatch[1].replace(/\s/g, ''))
    if (km >= 1000 && km <= 1_500_000) {
      const releve: KmReleve = { km, date: kmMatch[2].trim() }
      if (!relevesKm.some(r => r.km === km)) relevesKm.push(releve)
    }
  }
  relevesKm.sort((a, b) => a.km - b.km)

  const immatriculationVerifiee =
    /immatriculation\s*v[eé]rifi|v[eé]rifi[eé]\s*immatriculation|plaque.*v[eé]rifi|enregistr[eé]\s*SIV/i.test(text)

  const anomalie =
    /anomalie|incoh[eé]rence|kilom[eé]trage\s*suspect|kilom[eé]trage\s*manip|compteur\s*alté/i.test(text)
  const coherenceKm = !anomalie

  return { proprietaires, relevesKm, immatriculationVerifiee, coherenceKm, resume }
}

async function fetchWithBrowserless(targetUrl: string): Promise<string | null> {
  const key = process.env.BROWSERLESS_API_KEY
  if (!key) {
    console.log('Browserless: clé absente')
    return null
  }
  try {
    console.log('Browserless: tentative pour', targetUrl)
    const res = await fetch(
      `https://production-sfo.browserless.io/content?token=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          bestAttempt: true,
          waitForTimeout: 10000,
          gotoOptions: {
            waitUntil: 'networkidle2',
            timeout: 30000,
          },
          rejectResourceTypes: ['image', 'media', 'font', 'stylesheet'],
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          setExtraHTTPHeaders: {
            'Accept-Language': 'fr-FR,fr;q=0.9',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        }),
        signal: AbortSignal.timeout(45_000),
      }
    )
    console.log('Browserless status:', res.status)
    if (!res.ok) {
      const errBody = await res.text()
      console.log('Browserless error body:', errBody.slice(0, 500))
      return null
    }
    const html = await res.text()
    console.log('Browserless content length:', html.length)
    console.log('Browserless HTML début:', html.slice(0, 200))
    return html
  } catch (e) {
    console.log('Browserless exception:', e)
    return null
  }
}

async function fetchAutoviza(
  url: string
): Promise<{ data: HistoryData } | { blocked: true } | null> {
  const html = await fetchWithBrowserless(url)
  if (html) {
    const text = htmlToText(html)
    return { data: parseAutovizaData(text) }
  }

  try {
    const res = await fetch(url, {
      headers: SCRAPE_HEADERS,
      signal: AbortSignal.timeout(10_000),
    })
    if (res.status === 403 || res.status === 401) return { blocked: true }
    if (!res.ok) return null
    const html = await res.text()
    const text = htmlToText(html)
    return { data: parseAutovizaData(text) }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY
  console.log('BROWSERLESS_API_KEY présente:', !!BROWSERLESS_API_KEY)
  console.log('Clé (4 premiers chars):', BROWSERLESS_API_KEY?.slice(0, 4))

  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL manquante' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Protocole non autorisé' }, { status: 400 })
    }

    const hostname = parsedUrl.hostname

    // ── Direct Autoviza URL ─────────────────────────────────────────────────
    if (hostname.includes('autoviza.fr')) {
      const result = await fetchAutoviza(url)
      if (!result) {
        return NextResponse.json(
          { error: 'Impossible de récupérer le rapport Autoviza' },
          { status: 502 }
        )
      }
      if ('blocked' in result) {
        return NextResponse.json(
          {
            error: 'blocked',
            message:
              "Le rapport Autoviza bloque l'accès automatique. Copiez le contenu de la page et collez-le dans l'onglet Texte.",
          },
          { status: 403 }
        )
      }
      return NextResponse.json({
        text: result.data.resume,
        hasHistory: true,
        historySource: 'autoviza',
        historyData: result.data,
      })
    }

    // ── Generic scrape ──────────────────────────────────────────────────────
    let html: string | null = null

    // Attempt 1: Browserless (real Chrome, bypasses anti-bot protection)
    html = await fetchWithBrowserless(url)

    // Attempt 2: direct fetch fallback
    if (!html) {
      console.log('Browserless échoué, tentative fetch direct...')
      let directRes: Response
      try {
        directRes = await fetch(url, {
          headers: SCRAPE_HEADERS,
          signal: AbortSignal.timeout(15_000),
        })
      } catch {
        return NextResponse.json(
          { error: 'Impossible de joindre le site' },
          { status: 502 }
        )
      }

      if (directRes.status === 403 || directRes.status === 401) {
        const isLbc = hostname.includes('leboncoin.fr')
        return NextResponse.json(
          {
            error: 'blocked',
            message: isLbc
              ? "LeBonCoin bloque le scraping automatique même avec proxy. Ouvrez l'annonce, sélectionnez tout le texte (Ctrl+A → Ctrl+C) et collez-le ici."
              : "Ce site bloque l'accès automatique. Ouvrez l'annonce, sélectionnez tout le texte (Ctrl+A) et collez-le ici.",
          },
          { status: 403 }
        )
      }

      if (!directRes.ok) {
        return NextResponse.json(
          { error: `Le site a retourné une erreur ${directRes.status}` },
          { status: 502 }
        )
      }

      const contentType = directRes.headers.get('content-type') || ''
      if (!contentType.includes('text/html')) {
        return NextResponse.json(
          { error: "Le contenu récupéré n'est pas une page HTML" },
          { status: 400 }
        )
      }

      html = await directRes.text()
    }

    const annonceText = htmlToText(html).slice(0, 8000)

    // ── LeBonCoin: look for Autoviza link ───────────────────────────────────
    if (hostname.includes('leboncoin.fr')) {
      const autovizaUrl = findAutovizaUrl(html)

      if (autovizaUrl) {
        const autovizaResult = await fetchAutoviza(autovizaUrl)

        if (autovizaResult && !('blocked' in autovizaResult)) {
          return NextResponse.json({
            text: annonceText,
            hasHistory: true,
            historySource: 'autoviza',
            historyData: autovizaResult.data,
          })
        }

        return NextResponse.json({
          text: annonceText,
          hasHistory: false,
          autovizaUrl,
        })
      }
    }

    return NextResponse.json({ text: annonceText, hasHistory: false })
  } catch (error) {
    console.error('[API /scrape]', error)
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Délai dépassé pour charger la page' },
        { status: 504 }
      )
    }
    return NextResponse.json({ error: 'Impossible de récupérer la page' }, { status: 500 })
  }
}
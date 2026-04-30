import { NextRequest, NextResponse } from 'next/server'
import type { HistoryData, KmReleve } from '@/types'

// ── User agents ──────────────────────────────────────────────────────────────

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const MOBILE_UA  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

const STATIC_HEADERS = {
  'User-Agent': DESKTOP_UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
}

// ── HTML helpers ─────────────────────────────────────────────────────────────

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

// ── Site configuration ────────────────────────────────────────────────────────

type SiteType = 'static' | 'js-light' | 'js-heavy' | 'blocked'

interface SiteConfig {
  type: SiteType
  waitForTimeout?: number
  waitUntil?: 'networkidle0' | 'networkidle2' | 'load' | 'domcontentloaded'
  mobile?: boolean
  blockedMessage?: string
}

const BLOCKED_MSG_DEFAULT =
  "Ce site bloque l'accès automatique. Ouvrez l'annonce, appuyez sur Ctrl+A (sélectionner tout) puis Ctrl+C (copier), et collez le texte ici."

const SITE_CONFIGS: Record<string, SiteConfig> = {
  // ── France ──
  'lacentrale.fr':  { type: 'static' },
  'paruvendu.fr':   { type: 'static' },
  'largus.fr':      { type: 'static' },
  'leboncoin.fr':   { type: 'js-heavy', waitForTimeout: 15000, waitUntil: 'networkidle0', mobile: true },
  'autoscout24.fr': { type: 'js-light', waitForTimeout: 8000 },

  // ── Europe ──
  'autoscout24.com': { type: 'js-light', waitForTimeout: 8000 },
  'autoscout24.de':  { type: 'js-light', waitForTimeout: 8000 },
  'autoscout24.es':  { type: 'js-light', waitForTimeout: 8000 },
  'autoscout24.it':  { type: 'js-light', waitForTimeout: 8000 },
  'autoscout24.be':  { type: 'js-light', waitForTimeout: 8000 },
  'autoscout24.nl':  { type: 'js-light', waitForTimeout: 8000 },
  'autoscout24.pl':  { type: 'js-light', waitForTimeout: 8000 },
  'mobile.de':       { type: 'js-light', waitForTimeout: 8000 },
  'autotrader.co.uk':{ type: 'js-light', waitForTimeout: 8000 },
  'gumtree.com':     { type: 'js-light', waitForTimeout: 8000 },
  'coches.net':      { type: 'js-light', waitForTimeout: 8000 },
  'milanuncios.com': { type: 'js-light', waitForTimeout: 8000 },
  'subito.it':       { type: 'js-light', waitForTimeout: 8000 },
  'blocket.se':      { type: 'js-light', waitForTimeout: 8000 },
  'finn.no':         { type: 'js-light', waitForTimeout: 8000 },
  'otomoto.pl':      { type: 'js-light', waitForTimeout: 8000 },
  'autovit.ro':      { type: 'js-light', waitForTimeout: 8000 },

  // ── USA / Canada ──
  'cargurus.com':   { type: 'js-heavy', waitForTimeout: 15000, waitUntil: 'networkidle0', mobile: true },
  'cargurus.ca':    { type: 'js-heavy', waitForTimeout: 15000, waitUntil: 'networkidle0', mobile: true },
  'cars.com':       { type: 'js-light', waitForTimeout: 10000 },
  'autotrader.com': { type: 'js-light', waitForTimeout: 10000 },
  'craigslist.org': { type: 'js-light', waitForTimeout: 8000 },
  'truecar.com':    { type: 'js-light', waitForTimeout: 10000 },
  'ebay.com':       { type: 'js-light', waitForTimeout: 10000 },

  // ── Autres pays ──
  'olx.com':       { type: 'js-light', waitForTimeout: 8000 },
  'dubizzle.com':  { type: 'js-light', waitForTimeout: 8000 },
  'avito.ru':      { type: 'js-light', waitForTimeout: 8000 },
  'mobile.bg':     { type: 'js-light', waitForTimeout: 8000 },

  // ── Sites bloqués → copier-coller ──
  'facebook.com': {
    type: 'blocked',
    blockedMessage: "Facebook Marketplace bloque l'accès automatique. Ouvrez l'annonce, appuyez sur Ctrl+A (sélectionner tout) puis Ctrl+C (copier), et collez le texte ici.",
  },
  'carmax.com': {
    type: 'blocked',
    blockedMessage: "CarMax bloque l'accès automatique. Ouvrez l'annonce, appuyez sur Ctrl+A puis Ctrl+C, et collez le texte ici.",
  },
  'ebay.com/motors': {
    type: 'blocked',
    blockedMessage: BLOCKED_MSG_DEFAULT,
  },
}

function getSiteConfig(hostname: string): SiteConfig {
  for (const [domain, config] of Object.entries(SITE_CONFIGS)) {
    if (hostname.includes(domain)) return config
  }
  // Default: try js-light
  return { type: 'js-light', waitForTimeout: 8000 }
}

// ── Content validation ────────────────────────────────────────────────────────

function isValidCarListing(text: string): boolean {
  if (text.length < 300) return false
  const lower = text.toLowerCase()
  const keywords = [
    // Kilométrage
    'km', 'mileage', 'miles', 'kilomètre', 'kilométrage',
    // Prix
    'prix', 'price', 'precio', 'prezzo', '€', '$', '£', 'chf', 'mad', 'aed',
    // Année
    'année', 'year', 'año', 'anno', '201', '202', '199', '200',
    // Carburant
    'diesel', 'essence', 'gasoline', 'petrol', 'electric', 'hybride', 'hybrid', 'électrique',
    // Transmission
    'manual', 'automatic', 'automatique', 'manuelle', 'boîte',
    // Moteur
    'moteur', 'engine', 'motor', 'cylindr', 'turbo', 'hp', 'cv', 'kw',
    // Marques courantes
    'toyota', 'volkswagen', 'renault', 'peugeot', 'citroen', 'ford',
    'honda', 'bmw', 'mercedes', 'audi', 'nissan', 'hyundai', 'kia',
    'opel', 'seat', 'skoda', 'volvo', 'mazda', 'subaru', 'mitsubishi',
    // Termes d'annonce
    'vendeur', 'seller', 'dealer', 'propriétaire', 'owner',
    'used', 'occasion', 'usagé', 'segunda mano',
  ]
  const matchCount = keywords.filter(kw => lower.includes(kw)).length
  return matchCount >= 2
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchStatic(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: STATIC_HEADERS,
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('text/html')) return null
    return await res.text()
  } catch {
    return null
  }
}

async function fetchWithBrowserless(targetUrl: string, config: SiteConfig): Promise<string | null> {
  const key = process.env.BROWSERLESS_API_KEY
  if (!key) return null

  const ua = config.mobile ? MOBILE_UA : DESKTOP_UA
  const isHeavy = config.type === 'js-heavy'

  const body: Record<string, unknown> = {
    url: targetUrl,
    bestAttempt: true,
    waitForTimeout: config.waitForTimeout ?? 8000,
    gotoOptions: {
      waitUntil: config.waitUntil ?? 'networkidle2',
      timeout: isHeavy ? 50000 : 35000,
    },
    rejectResourceTypes: ['image', 'media', 'font', 'stylesheet'],
    userAgent: { userAgent: ua },
    setExtraHTTPHeaders: {
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  }

  if (config.mobile) {
    body.viewport = { width: 390, height: 844, isMobile: true, deviceScaleFactor: 3 }
  }

  try {
    const res = await fetch(
      `https://production-sfo.browserless.io/content?token=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(isHeavy ? 65_000 : 50_000),
      }
    )
    if (!res.ok) {
      const errBody = await res.text()
      console.log('[Browserless] error', res.status, errBody.slice(0, 300))
      return null
    }
    const html = await res.text()
    console.log('[Browserless] ok, length:', html.length)
    return html
  } catch (e) {
    console.log('[Browserless] exception:', e)
    return null
  }
}

// ── Autoviza ─────────────────────────────────────────────────────────────────

async function fetchAutoviza(
  url: string
): Promise<{ data: HistoryData } | { blocked: true } | null> {
  const html = await fetchWithBrowserless(url, { type: 'js-light', waitForTimeout: 6000 })
  if (html) {
    return { data: parseAutovizaData(htmlToText(html)) }
  }
  try {
    const res = await fetch(url, { headers: STATIC_HEADERS, signal: AbortSignal.timeout(10_000) })
    if (res.status === 403 || res.status === 401) return { blocked: true }
    if (!res.ok) return null
    return { data: parseAutovizaData(htmlToText(await res.text())) }
  } catch {
    return null
  }
}

// ── CarGurus internal API ─────────────────────────────────────────────────────

function extractCarGurusListingId(url: string): string | null {
  const fragmentMatch = url.match(/[#&]listing=(\d+)/)
  if (fragmentMatch) return fragmentMatch[1]
  const paramMatch = url.match(/listingId=(\d+)/)
  if (paramMatch) return paramMatch[1]
  return null
}

async function fetchCarGurusListing(listingId: string, domain: string): Promise<string | null> {
  const base = domain.includes('.ca') ? 'https://www.cargurus.ca' : 'https://www.cargurus.com'
  const referer = `${base}/Cars/vehicleDetails_html?listingId=${listingId}`

  const endpoints = [
    `${base}/Cars/ajax/getVdpDetails.action?listingId=${listingId}`,
    `${base}/Cars/ajax/getListing.action?listingId=${listingId}`,
    `${base}/api/v1/listings/${listingId}`,
  ]

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'User-Agent': DESKTOP_UA,
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-CA,en;q=0.9,fr;q=0.8',
          Referer: referer,
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: AbortSignal.timeout(10_000),
      })
      console.log('[CarGurus API]', endpoint, '→', res.status)
      if (!res.ok) continue
      const data = await res.json()
      const text = JSON.stringify(data, null, 2)
      console.log('[CarGurus API] ok, length:', text.length)
      return text
    } catch (e) {
      console.log('[CarGurus API] échec:', endpoint, e)
    }
  }
  return null
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
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
            message: "Le rapport Autoviza bloque l'accès automatique. Copiez le contenu de la page et collez-le dans l'onglet Texte.",
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

    // ── CarGurus: internal API (faster + more reliable than Browserless) ────
    if (hostname.includes('cargurus.com') || hostname.includes('cargurus.ca')) {
      const listingId = extractCarGurusListingId(url)
      console.log('[CarGurus] URL:', url)
      console.log('[CarGurus] listingId:', listingId)

      if (listingId) {
        const apiText = await fetchCarGurusListing(listingId, hostname)
        console.log('[CarGurus] API response length:', apiText?.length ?? 0)
        if (apiText) {
          return NextResponse.json({ text: apiText.slice(0, 8000), hasHistory: false })
        }
      }

      return NextResponse.json(
        {
          error: 'blocked',
          message: "CarGurus ne permet pas l'accès automatique. Ouvrez l'annonce, appuyez sur Ctrl+A puis Ctrl+C et collez le texte ici.",
        },
        { status: 403 }
      )
    }

    // ── Route by site config ────────────────────────────────────────────────
    const config = getSiteConfig(hostname)
    console.log(`[scrape] ${hostname} → type: ${config.type}`)

    if (config.type === 'blocked') {
      return NextResponse.json(
        {
          error: 'blocked',
          message: config.blockedMessage ?? BLOCKED_MSG_DEFAULT,
        },
        { status: 403 }
      )
    }

    // ── Fetch HTML ──────────────────────────────────────────────────────────
    let html: string | null = null

    if (config.type === 'static') {
      html = await fetchStatic(url)
      // Static fallback to Browserless if direct fetch returns no content
      if (!html || html.length < 1000) {
        html = await fetchWithBrowserless(url, { type: 'js-light', waitForTimeout: 6000 })
      }
    } else {
      // js-light or js-heavy: Browserless first, then static fallback
      html = await fetchWithBrowserless(url, config)
      if (!html) {
        console.log('[scrape] Browserless failed, trying static fetch…')
        html = await fetchStatic(url)
      }
    }

    if (!html) {
      return NextResponse.json(
        {
          error: 'blocked',
          message: BLOCKED_MSG_DEFAULT,
        },
        { status: 403 }
      )
    }

    const annonceText = htmlToText(html).slice(0, 8000)

    // ── Validate content — soft check, let Claude decide ───────────────────
    const lowConfidence = !isValidCarListing(annonceText)
    if (lowConfidence) {
      console.log('[scrape] low confidence content, length:', annonceText.length)
    }

    // ── Autoviza detection (all sites) ──────────────────────────────────────
    const autovizaUrl = findAutovizaUrl(html)

    if (autovizaUrl) {
      const autovizaResult = await fetchAutoviza(autovizaUrl)
      if (autovizaResult && !('blocked' in autovizaResult)) {
        return NextResponse.json({
          text: annonceText,
          hasHistory: true,
          historySource: 'autoviza',
          historyData: autovizaResult.data,
          lowConfidence,
        })
      }
      // Found URL but couldn't fetch → return URL for manual entry
      return NextResponse.json({ text: annonceText, hasHistory: false, autovizaUrl, lowConfidence })
    }

    return NextResponse.json({ text: annonceText, hasHistory: false, lowConfidence })

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

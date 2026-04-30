import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const modele = searchParams.get('modele')
  const etapeId = searchParams.get('etape_id')
  const query = searchParams.get('query')

  if (!modele || !etapeId || !query) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  // Check Supabase cache
  const { data: cached } = await supabase
    .from('etapes_images')
    .select('image_url, legende')
    .eq('modele', modele)
    .eq('etape_id', etapeId)
    .single()

  if (cached?.image_url) {
    return NextResponse.json({ image_url: cached.image_url, legende: cached.legende })
  }

  // Fetch from Google Custom Search API
  const apiKey = process.env.GOOGLE_SEARCH_KEY
  const cx = process.env.GOOGLE_SEARCH_CX

  if (!apiKey || !cx) {
    return NextResponse.json({ error: 'Google Search non configuré' }, { status: 503 })
  }

  try {
    const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&searchType=image&num=1&safe=active&imgSize=medium`
    const res = await fetch(googleUrl)
    const data = await res.json()

    const item = data.items?.[0]
    if (!item) {
      return NextResponse.json({ error: 'Aucune image trouvée' }, { status: 404 })
    }

    const image_url: string = item.link
    const legende: string = item.title ?? query

    // Save to cache
    await supabase.from('etapes_images').upsert({
      modele,
      etape_id: etapeId,
      image_url,
      legende,
    }, { onConflict: 'modele,etape_id' })

    return NextResponse.json({ image_url, legende })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

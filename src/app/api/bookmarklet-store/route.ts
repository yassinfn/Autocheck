import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Uses the service role key to bypass RLS on bookmarklet_tokens
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Preflight — required for bookmarklet cross-origin fetch
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  try {
    const { url, text } = await req.json() as { url?: string; text?: string }

    if (!text) {
      return NextResponse.json({ error: 'Texte requis' }, { status: 400, headers: CORS })
    }

    const token = Math.random().toString(36).slice(2, 10)
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    const { error } = await supabase.from('bookmarklet_tokens').insert({
      token,
      url: url ?? '',
      text: text.slice(0, 15000),
      expires_at,
    })

    if (error) {
      console.error('[bookmarklet-store POST]', error.message)
      return NextResponse.json({ error: 'Erreur de stockage' }, { status: 500, headers: CORS })
    }

    // Fire-and-forget cleanup of expired tokens
    supabase
      .from('bookmarklet_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .then(({ error: e }) => { if (e) console.error('[bookmarklet-store cleanup]', e.message) })

    return NextResponse.json({ token }, { headers: CORS })
  } catch (err) {
    console.error('[bookmarklet-store POST]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500, headers: CORS })
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400, headers: CORS })
    }

    const { data, error } = await supabase
      .from('bookmarklet_tokens')
      .select('url, text, expires_at')
      .eq('token', token)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Token expiré ou invalide' }, { status: 404, headers: CORS })
    }

    if (new Date(data.expires_at) < new Date()) {
      supabase.from('bookmarklet_tokens').delete().eq('token', token).then(() => {})
      return NextResponse.json({ error: 'Token expiré' }, { status: 404, headers: CORS })
    }

    // Single-use: delete after read
    supabase.from('bookmarklet_tokens').delete().eq('token', token).then(() => {})

    return NextResponse.json({ url: data.url, text: data.text }, { headers: CORS })
  } catch (err) {
    console.error('[bookmarklet-store GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500, headers: CORS })
  }
}

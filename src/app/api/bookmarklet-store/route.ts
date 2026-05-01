import { NextRequest, NextResponse } from 'next/server'

// In-memory store — TTL 5 min, single-use tokens
// Works well for the expected usage: POST then immediate GET from same user.
const store = new Map<string, { url: string; text: string; expires: number }>()

function cleanup() {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (value.expires < now) store.delete(key)
  }
}

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
  const { url, text } = await req.json() as { url?: string; text?: string }
  const token = Math.random().toString(36).slice(2, 10)
  store.set(token, {
    url: url ?? '',
    text: text ?? '',
    expires: Date.now() + 5 * 60 * 1000,
  })
  cleanup()
  return NextResponse.json({ token }, { headers: CORS })
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
  }
  const entry = store.get(token)
  if (!entry || entry.expires < Date.now()) {
    store.delete(token)
    return NextResponse.json({ error: 'Token expiré ou invalide' }, { status: 404 })
  }
  store.delete(token) // single-use
  return NextResponse.json({ url: entry.url, text: entry.text })
}

import { NextRequest } from 'next/server'

export const runtime = 'edge'
import { extractJSON } from '@/lib/claude'
import { VISITE_SYSTEM, buildScenarioPrompt } from '@/lib/prompts/visite'
import type { AnalyseResult, ScenarioResult } from '@/types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { analyse } = body as { analyse: AnalyseResult }

  const encoder = new TextEncoder()

  function send(controller: ReadableStreamDefaultController, obj: object) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!analyse) {
          send(controller, { type: 'error', payload: { message: 'Données manquantes' } })
          controller.close()
          return
        }

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 8000,
            stream: true,
            system: VISITE_SYSTEM,
            messages: [{ role: 'user', content: buildScenarioPrompt(analyse) }],
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

        // Strip markdown fences Claude occasionally adds in streaming mode
        const cleaned = fullText
          .replace(/^```(?:json)?\s*\n?/i, '')
          .replace(/\n?```\s*$/i, '')
          .trim()

        console.log('[visite-stream] fullText length:', fullText.length)
        console.log('[visite-stream] fullText end (last 200 chars):', fullText.slice(-200))
        console.log('[visite-stream] cleaned length:', cleaned.length)
        console.log('[visite-stream] cleaned end:', cleaned.slice(-200))

        if (cleaned.length < 100) {
          throw new Error('Réponse Claude trop courte, réessayez.')
        }
        if (!cleaned.trimEnd().endsWith('}')) {
          throw new Error(`Réponse Claude tronquée (${cleaned.length} chars, finit par: "${cleaned.slice(-30)}"). Réessayez.`)
        }

        const result = extractJSON<ScenarioResult>(cleaned)
        send(controller, { type: 'scenario', payload: result })
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

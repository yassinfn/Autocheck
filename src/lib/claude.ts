import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function callClaude(
  userMessage: string,
  systemMessage?: string,
  maxTokens = 2000
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    ...(systemMessage && { system: systemMessage }),
    messages: [{ role: 'user', content: userMessage }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected content type')
  return block.text
}

export async function callClaudeVision(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  prompt: string,
  maxTokens = 2000
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected content type')
  return block.text
}

export function extractJSON<T>(text: string): T {
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const stripped = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()

  // Try direct parse first
  try {
    return JSON.parse(stripped) as T
  } catch {}

  // Fallback: extract JSON object from text
  try {
    const match = stripped.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0]) as T
  } catch {}

  // Fallback: extract JSON array
  try {
    const match = stripped.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0]) as T
  } catch {}

  throw new Error(`JSON parse failed. Raw: ${text.slice(0, 300)}`)
}

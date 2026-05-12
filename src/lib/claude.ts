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

export async function callClaudeVisionMulti(
  images: { data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' }[],
  prompt: string,
  maxTokens = 1500
): Promise<string> {
  const content: Anthropic.Messages.ContentBlockParam[] = [
    ...images.map(img => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: img.mediaType, data: img.data },
    })),
    { type: 'text' as const, text: prompt },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected content type')
  return block.text
}

export function extractJSON<T>(text: string): T {
  // Find the first { or [ and the last matching } or ]
  // Works regardless of code fences, preamble text, or newline style
  const firstBrace   = text.indexOf('{')
  const firstBracket = text.indexOf('[')

  let start = -1
  let closeChar = ''
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace; closeChar = '}'
  } else if (firstBracket !== -1) {
    start = firstBracket; closeChar = ']'
  }

  if (start !== -1) {
    const end = text.lastIndexOf(closeChar)
    if (end > start) {
      try { return JSON.parse(text.slice(start, end + 1)) as T } catch {}
    }
  }

  throw new Error(`JSON parse failed. Raw: ${text.slice(0, 300)}`)
}

import type { AiMessage, AiService } from '@/modules/ai'

const SYSTEM_PROMPT =
  'Produce a 3-5 word title for the conversation below. Plain text, no quotes, no trailing punctuation, no leading verbs like "Discussion about". Return only the title.'

const MAX_LEN = 60

export async function generateTitle(
  service: AiService,
  model: string,
  firstUser: string,
  firstAssistant: string,
  signal: AbortSignal,
): Promise<string> {
  const messages: AiMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `User: ${firstUser}\n\nAssistant: ${firstAssistant}`,
    },
  ]

  const result = await service.chat({
    messages,
    model,
    maxTokens: 30,
    signal,
  })

  return sanitise(result.content)
}

function sanitise(raw: string): string {
  let title = raw.trim()
  title = title.replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, '')
  title = title.replace(/[.!?,:;]+$/g, '')
  title = title.replace(/\s+/g, ' ').trim()
  if (title.length > MAX_LEN) {
    title = title.slice(0, MAX_LEN).trimEnd()
  }
  return title
}

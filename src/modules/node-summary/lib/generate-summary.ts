import type { AiMessage } from '@/modules/ai'
import { ClaudeService } from '@/modules/ai'

export async function* streamSummary({
  apiKey,
  model,
  system,
  user,
  signal,
}: {
  apiKey: string
  model: string
  system: string
  user: string
  signal: AbortSignal
}): AsyncIterable<string> {
  const service = new ClaudeService({ apiKey, dangerouslyAllowBrowser: true })
  const messages: AiMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
  let accumulated = ''
  for await (const chunk of service.stream({
    messages,
    model,
    maxTokens: 700,
    signal,
  })) {
    if (chunk.delta) {
      accumulated += chunk.delta
      yield accumulated
    }
    if (chunk.done) return
  }
}

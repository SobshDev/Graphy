import type { AiMessage } from '@/modules/ai'
import { ClaudeService } from '@/modules/ai'

export const VALIDATOR_MODEL = 'claude-haiku-4-5-20251001'

const VALIDATOR_SCHEMA = {
  type: 'object',
  properties: {
    stillValid: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['stillValid', 'reason'],
  additionalProperties: false,
} as const

export type ValidatorResult = { stillValid: boolean; reason: string }

export async function validateCached({
  apiKey,
  system,
  user,
  signal,
}: {
  apiKey: string
  system: string
  user: string
  signal: AbortSignal
}): Promise<ValidatorResult> {
  const service = new ClaudeService({ apiKey, dangerouslyAllowBrowser: true })
  const messages: AiMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
  const { data } = await service.generateObject<ValidatorResult>({
    messages,
    model: VALIDATOR_MODEL,
    maxTokens: 200,
    schema: VALIDATOR_SCHEMA,
    signal,
  })
  return data
}

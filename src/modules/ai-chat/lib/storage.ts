import type { AiProvider, ChatModel } from '../types'
import { AI_PROVIDERS, CHAT_MODELS, DEFAULT_CHAT_MODEL } from '../types'

const STORAGE_KEY = 'graphy.ai-config'

export interface StoredAiConfig {
  activeModel: ChatModel
  keys: Partial<Record<AiProvider, string>>
}

export const INITIAL_AI_CONFIG: StoredAiConfig = {
  activeModel: DEFAULT_CHAT_MODEL,
  keys: {},
}

function isChatModel(value: unknown): value is ChatModel {
  return (
    typeof value === 'string' &&
    (CHAT_MODELS as ReadonlyArray<string>).includes(value)
  )
}

export function readAiConfig(): StoredAiConfig {
  if (typeof window === 'undefined') return INITIAL_AI_CONFIG
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_AI_CONFIG
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return INITIAL_AI_CONFIG

    const candidate = parsed as { activeModel?: unknown; keys?: unknown }
    const activeModel = isChatModel(candidate.activeModel)
      ? candidate.activeModel
      : DEFAULT_CHAT_MODEL

    const keys: Partial<Record<AiProvider, string>> = {}
    if (candidate.keys && typeof candidate.keys === 'object') {
      for (const provider of AI_PROVIDERS) {
        const value = (candidate.keys as Record<string, unknown>)[provider]
        if (typeof value === 'string' && value.length > 0) {
          keys[provider] = value
        }
      }
    }

    return { activeModel, keys }
  } catch {
    return INITIAL_AI_CONFIG
  }
}

export function writeAiConfig(config: StoredAiConfig): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // localStorage unavailable — silently no-op.
  }
}

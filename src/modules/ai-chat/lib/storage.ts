import type { AiProvider } from '../types'
import { AI_PROVIDERS } from '../types'

const STORAGE_KEY = 'graphy.ai-config'

export interface StoredAiConfig {
  activeProvider: AiProvider | null
  keys: Partial<Record<AiProvider, string>>
}

export const INITIAL_AI_CONFIG: StoredAiConfig = {
  activeProvider: null,
  keys: {},
}

function isAiProvider(value: unknown): value is AiProvider {
  return (
    typeof value === 'string' &&
    (AI_PROVIDERS as ReadonlyArray<string>).includes(value)
  )
}

export function readAiConfig(): StoredAiConfig {
  if (typeof window === 'undefined') return INITIAL_AI_CONFIG
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_AI_CONFIG
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return INITIAL_AI_CONFIG

    const candidate = parsed as { activeProvider?: unknown; keys?: unknown }
    const activeProvider = isAiProvider(candidate.activeProvider)
      ? candidate.activeProvider
      : null

    const keys: Partial<Record<AiProvider, string>> = {}
    if (candidate.keys && typeof candidate.keys === 'object') {
      for (const provider of AI_PROVIDERS) {
        const value = (candidate.keys as Record<string, unknown>)[provider]
        if (typeof value === 'string' && value.length > 0) {
          keys[provider] = value
        }
      }
    }

    return { activeProvider, keys }
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

import { useCallback, useEffect, useState } from 'react'

import type { AiProvider } from '../types'
import { AI_PROVIDERS } from '../types'

const STORAGE_KEY = 'graphy.ai-config'

export interface AiConfig {
  activeProvider: AiProvider | null
  keys: Partial<Record<AiProvider, string>>
}

const INITIAL_CONFIG: AiConfig = {
  activeProvider: null,
  keys: {},
}

function isAiProvider(value: unknown): value is AiProvider {
  return (
    typeof value === 'string' &&
    (AI_PROVIDERS as ReadonlyArray<string>).includes(value)
  )
}

function parseStoredConfig(raw: string | null): AiConfig {
  if (!raw) return INITIAL_CONFIG
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return INITIAL_CONFIG

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
    return INITIAL_CONFIG
  }
}

function readConfig(): AiConfig {
  if (typeof window === 'undefined') return INITIAL_CONFIG
  try {
    return parseStoredConfig(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return INITIAL_CONFIG
  }
}

function writeConfig(config: AiConfig): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // localStorage may be unavailable (privacy mode, quota). Silently no-op.
  }
}

export interface UseAiConfigResult {
  activeProvider: AiProvider | null
  keys: Partial<Record<AiProvider, string>>
  setActiveProvider: (provider: AiProvider) => void
  setKey: (provider: AiProvider, key: string) => void
}

export function useAiConfig(): UseAiConfigResult {
  const [config, setConfig] = useState<AiConfig>(INITIAL_CONFIG)

  useEffect(() => {
    setConfig(readConfig())
  }, [])

  const setActiveProvider = useCallback((provider: AiProvider) => {
    setConfig((prev) => {
      const next: AiConfig = { ...prev, activeProvider: provider }
      writeConfig(next)
      return next
    })
  }, [])

  const setKey = useCallback((provider: AiProvider, key: string) => {
    setConfig((prev) => {
      const next: AiConfig = {
        ...prev,
        keys: { ...prev.keys, [provider]: key },
      }
      writeConfig(next)
      return next
    })
  }, [])

  return {
    activeProvider: config.activeProvider,
    keys: config.keys,
    setActiveProvider,
    setKey,
  }
}

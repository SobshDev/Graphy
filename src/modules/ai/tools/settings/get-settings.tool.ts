import type { AiTool } from '../tools.interface'

type SettingsKey = 'theme' | 'defaultModel' | 'providerKeys'

interface GetSettingsInput {
  key?: SettingsKey
}

const THEME_STORAGE_KEY = 'graphy.theme.v1'
const AI_CONFIG_STORAGE_KEY = 'graphy.ai-config'

function readJson(key: string): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

function readTheme(): string | undefined {
  const theme = readJson(THEME_STORAGE_KEY)
  const preset = theme?.preset
  return typeof preset === 'string' ? preset : undefined
}

function readAiConfig(): {
  defaultModel?: string
  providerKeys: Record<string, { hasKey: boolean }>
} {
  const config = readJson(AI_CONFIG_STORAGE_KEY)
  const defaultModelRaw = config?.defaultModel ?? config?.activeModel
  const defaultModel =
    typeof defaultModelRaw === 'string' ? defaultModelRaw : undefined
  const providerKeys: Record<string, { hasKey: boolean }> = {}
  const keys = config?.keys
  if (keys && typeof keys === 'object') {
    for (const [provider, value] of Object.entries(
      keys as Record<string, unknown>,
    )) {
      providerKeys[provider] = {
        hasKey: typeof value === 'string' && value.length > 0,
      }
    }
  }
  return { defaultModel, providerKeys }
}

export function createGetSettingsTool(): AiTool {
  return {
    name: 'get_settings',
    description:
      'Return current Graphy settings such as the active theme, default model, or which providers have an API key configured. For security, API keys are never returned — only { hasKey: boolean } per provider.',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          enum: ['theme', 'defaultModel', 'providerKeys'],
          description:
            'Specific setting to retrieve. Omit to return all settings.',
        },
      },
      additionalProperties: false,
    },
    handler: (input: unknown) => {
      const { key } = input as GetSettingsInput
      const { defaultModel, providerKeys } = readAiConfig()
      const theme = readTheme()
      const all = { theme, defaultModel, providerKeys }
      if (!key) return { settings: all }
      return { settings: { [key]: all[key] } }
    },
  }
}

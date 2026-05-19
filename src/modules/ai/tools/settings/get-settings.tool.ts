import { getDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

type SettingsKey = 'theme' | 'defaultModel' | 'providerKeys'

interface GetSettingsDesktop {
  getSettings?: (payload: { key?: SettingsKey }) => Promise<{
    settings: {
      theme?: string
      defaultModel?: string
      // Raw API keys are NEVER returned. Only presence is indicated.
      providerKeys?: Record<string, { hasKey: boolean }>
    }
  }>
}

interface GetSettingsInput {
  key?: SettingsKey
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
    handler: async (input: unknown) => {
      const { key } = input as GetSettingsInput
      const ext = getDesktop() as (GetSettingsDesktop & object) | null
      if (!ext?.getSettings) {
        return {
          available: false,
          reason: 'IPC method `getSettings` not wired — see STUBS.md',
        }
      }
      return ext.getSettings({ key })
    },
  }
}

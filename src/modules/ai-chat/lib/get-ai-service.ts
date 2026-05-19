import type { AiService } from '@/modules/ai'
import { ClaudeService, OpenRouterService } from '@/modules/ai'

import type { AiProvider } from '../types'

export class AiServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiServiceUnavailableError'
  }
}

export function createAiService(
  provider: AiProvider,
  apiKey: string,
): AiService {
  switch (provider) {
    case 'claude':
      return new ClaudeService({
        apiKey,
        dangerouslyAllowBrowser: true,
      })
    case 'openrouter':
      return new OpenRouterService({
        apiKey,
        referer: 'https://graphy.dev',
        title: 'Graphy',
      })
    case 'codex':
      // The Codex SDK spawns the local `codex` CLI as a subprocess (see
      // src/modules/ai/codex.service.ts). It can't run in the renderer; it
      // needs an Electron main-process bridge that we haven't built yet.
      throw new AiServiceUnavailableError(
        'Codex chat requires a desktop bridge that is not wired up yet. Switch to Claude to chat.',
      )
  }
}

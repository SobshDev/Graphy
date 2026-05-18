export type AiProvider = 'claude' | 'codex'

export const AI_PROVIDERS: ReadonlyArray<AiProvider> = ['claude', 'codex']

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  claude: 'Claude',
  codex: 'Codex',
}

export const AI_PROVIDER_KEY_PLACEHOLDERS: Record<AiProvider, string> = {
  claude: 'sk-ant-...',
  codex: 'sk-...',
}

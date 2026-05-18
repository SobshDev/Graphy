import type { AiToolCall } from '@/modules/ai'

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

export type ChatModel =
  | 'opus-4-7-fast'
  | 'opus-4-7'
  | 'sonnet-4-6'
  | 'haiku-4-5'

export const CHAT_MODELS: ReadonlyArray<ChatModel> = [
  'opus-4-7-fast',
  'opus-4-7',
  'sonnet-4-6',
  'haiku-4-5',
]

export const CHAT_MODEL_LABELS: Record<ChatModel, string> = {
  'opus-4-7-fast': 'Opus 4.7 (fast)',
  'opus-4-7': 'Opus 4.7',
  'sonnet-4-6': 'Sonnet 4.6',
  'haiku-4-5': 'Haiku 4.5',
}

export const CHAT_MODEL_API_ID: Record<ChatModel, string> = {
  'opus-4-7-fast': 'claude-opus-4-7',
  'opus-4-7': 'claude-opus-4-7',
  'sonnet-4-6': 'claude-sonnet-4-6',
  'haiku-4-5': 'claude-haiku-4-5-20251001',
}

export const CHAT_MODEL_PROVIDER: Record<ChatModel, AiProvider> = {
  'opus-4-7-fast': 'claude',
  'opus-4-7': 'claude',
  'sonnet-4-6': 'claude',
  'haiku-4-5': 'claude',
}

export const DEFAULT_CHAT_MODEL: ChatModel = 'sonnet-4-6'

export interface TokenUsage {
  prompt: number
  completion: number
  total: number
}

export const EMPTY_TOKEN_USAGE: TokenUsage = {
  prompt: 0,
  completion: 0,
  total: 0,
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  pending?: boolean
  error?: string
  toolCalls?: AiToolCall[]
}

import type { AiToolCall } from '@/modules/ai'

export type AiProvider = 'claude' | 'codex' | 'openrouter'

export const AI_PROVIDERS: ReadonlyArray<AiProvider> = [
  'claude',
  'codex',
  'openrouter',
]

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  claude: 'Claude',
  codex: 'Codex',
  openrouter: 'OpenRouter',
}

export const AI_PROVIDER_KEY_PLACEHOLDERS: Record<AiProvider, string> = {
  claude: 'sk-ant-...',
  codex: 'sk-...',
  openrouter: 'sk-or-v1-...',
}

export type ChatModel =
  | 'opus-4-7-fast'
  | 'opus-4-7'
  | 'sonnet-4-6'
  | 'haiku-4-5'
  | 'deepseek-chat-v3-1'
  | 'grok-4-3'
  | 'gpt-5-4-nano'

export const CHAT_MODELS: ReadonlyArray<ChatModel> = [
  'opus-4-7-fast',
  'opus-4-7',
  'sonnet-4-6',
  'haiku-4-5',
  'deepseek-chat-v3-1',
  'grok-4-3',
  'gpt-5-4-nano',
]

export const CHAT_MODEL_LABELS: Record<ChatModel, string> = {
  'opus-4-7-fast': 'Opus 4.7 (fast)',
  'opus-4-7': 'Opus 4.7',
  'sonnet-4-6': 'Sonnet 4.6',
  'haiku-4-5': 'Haiku 4.5',
  'deepseek-chat-v3-1': 'DeepSeek Chat v3.1',
  'grok-4-3': 'Grok 4.3',
  'gpt-5-4-nano': 'GPT-5.4 Nano',
}

export const CHAT_MODEL_API_ID: Record<ChatModel, string> = {
  'opus-4-7-fast': 'claude-opus-4-7',
  'opus-4-7': 'claude-opus-4-7',
  'sonnet-4-6': 'claude-sonnet-4-6',
  'haiku-4-5': 'claude-haiku-4-5-20251001',
  'deepseek-chat-v3-1': 'deepseek/deepseek-chat-v3.1',
  'grok-4-3': 'x-ai/grok-4.3',
  'gpt-5-4-nano': 'openai/gpt-5.4-nano',
}

export const CHAT_MODEL_PROVIDER: Record<ChatModel, AiProvider> = {
  'opus-4-7-fast': 'claude',
  'opus-4-7': 'claude',
  'sonnet-4-6': 'claude',
  'haiku-4-5': 'claude',
  'deepseek-chat-v3-1': 'openrouter',
  'grok-4-3': 'openrouter',
  'gpt-5-4-nano': 'openrouter',
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

export type ChatSegment =
  | { kind: 'text'; text: string }
  | { kind: 'tool'; call: AiToolCall }

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  pending?: boolean
  error?: string
  toolCalls?: AiToolCall[]
  segments?: ChatSegment[]
}

export interface Conversation {
  id: string
  title: string | null
  createdAt: number
  updatedAt: number
  model: ChatModel
  messages: ChatMessage[]
  tokenUsage: TokenUsage
}

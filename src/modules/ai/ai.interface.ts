import type { AiTool, AiToolCall } from './tools/tools.interface'

export type AiRole = 'system' | 'user' | 'assistant'

export interface AiMessage {
  role: AiRole
  content: string
}

export interface AiChatOptions {
  messages: AiMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  tools?: AiTool[]
  maxToolIterations?: number
}

export interface AiUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface AiChatResult {
  content: string
  model: string
  finishReason?:
    | 'stop'
    | 'length'
    | 'content_filter'
    | 'tool_max_iterations'
    | (string & {})
  usage?: AiUsage
  toolCalls?: AiToolCall[]
}

export interface AiStreamChunk {
  delta: string
  done: boolean
  result?: AiChatResult
  toolCall?: AiToolCall
}

export interface AiStructuredOptions<T> extends AiChatOptions {
  schema: object
  _output?: T
}

export interface AiStructuredResult<T> {
  data: T
  raw: AiChatResult
}

export interface AiService {
  chat: (options: AiChatOptions) => Promise<AiChatResult>
  stream: (options: AiChatOptions) => AsyncIterable<AiStreamChunk>
  generateObject: <T>(
    options: AiStructuredOptions<T>,
  ) => Promise<AiStructuredResult<T>>
}

export type AiRole = 'system' | 'user' | 'assistant'

export interface AiMessage {
  role: AiRole
  content: string
}

export interface AiToolDefinition<TArgs = unknown, TResult = unknown> {
  name: string
  description: string
  inputSchema: object
  execute: (
    args: TArgs,
    ctx: { signal?: AbortSignal },
  ) => Promise<TResult> | TResult
}

export interface AiToolCall {
  id: string
  name: string
  args: unknown
}

export interface AiToolResult {
  id: string
  name: string
  content: string
  isError: boolean
}

export interface AiChatOptions {
  messages: AiMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  // AiToolDefinition is contravariant on TArgs via execute(); widening to
  // <any, any> here lets the array accept heterogeneous typed tool sets.
  tools?: Array<AiToolDefinition<any, any>>
  maxToolRounds?: number
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
    | 'max_tool_rounds'
    | (string & {})
  usage?: AiUsage
  toolCalls?: Array<{ call: AiToolCall; result: AiToolResult }>
}

export type AiStreamChunk =
  | { type: 'text'; delta: string }
  | { type: 'tool_call'; call: AiToolCall }
  | { type: 'tool_result'; result: AiToolResult }
  | {
      type: 'done'
      finishReason?: AiChatResult['finishReason']
      usage?: AiUsage
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

export const DEFAULT_MAX_TOOL_ROUNDS = 25

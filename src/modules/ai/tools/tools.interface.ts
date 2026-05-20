export interface AiTool<TInput = unknown, TOutput = unknown> {
  name: string
  description: string
  inputSchema: object
  handler: (
    input: TInput,
    ctx: { signal?: AbortSignal },
  ) => Promise<TOutput> | TOutput
}

export interface AiToolCall {
  id: string
  name: string
  input: unknown
  output: unknown
  isError?: boolean
  pending?: boolean
}

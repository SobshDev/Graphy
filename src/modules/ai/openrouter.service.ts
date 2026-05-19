import type {
  AiChatOptions,
  AiChatResult,
  AiMessage,
  AiService,
  AiStreamChunk,
  AiStructuredOptions,
  AiStructuredResult,
  AiUsage,
} from './ai.interface'
import type { AiTool, AiToolCall } from './tools/tools.interface'

export interface OpenRouterServiceOptions {
  apiKey: string
  defaultModel?: string
  baseUrl?: string
  /**
   * Sent as `HTTP-Referer`. OpenRouter uses it for app attribution / ranking;
   * it is not used for auth.
   */
  referer?: string
  /** Sent as `X-Title`. Same purpose as `referer`. */
  title?: string
}

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_MAX_TOOL_ITERATIONS = 8

type OrFunctionToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

type OrChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | {
      role: 'assistant'
      content: string | null
      tool_calls?: OrFunctionToolCall[]
    }
  | { role: 'tool'; tool_call_id: string; content: string }

interface OrTool {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters: object
  }
}

interface OrUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens?: number
}

interface OrChoiceMessage {
  role: 'assistant'
  content: string | null
  tool_calls?: OrFunctionToolCall[]
}

interface OrResponse {
  id?: string
  model?: string
  choices?: Array<{
    index: number
    message: OrChoiceMessage
    finish_reason: string | null
  }>
  usage?: OrUsage
  error?: { message?: string; code?: string | number }
}

interface OrStreamToolCallDelta {
  index: number
  id?: string
  type?: 'function'
  function?: { name?: string; arguments?: string }
}

interface OrStreamChoiceDelta {
  role?: string
  content?: string | null
  tool_calls?: OrStreamToolCallDelta[]
}

interface OrStreamEvent {
  id?: string
  model?: string
  choices?: Array<{
    index: number
    delta?: OrStreamChoiceDelta
    finish_reason?: string | null
  }>
  usage?: OrUsage | null
  error?: { message?: string }
}

function mapUsage(usage: OrUsage | null | undefined): AiUsage | undefined {
  if (!usage) return undefined
  const total =
    usage.total_tokens ?? usage.prompt_tokens + usage.completion_tokens
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: total,
  }
}

function mapFinishReason(reason: string | null): AiChatResult['finishReason'] {
  if (reason === 'stop') return 'stop'
  if (reason === 'length') return 'length'
  if (reason === 'content_filter') return 'content_filter'
  if (reason === 'tool_calls') return 'stop'
  return reason ?? undefined
}

function mapMessages(messages: AiMessage[]): OrChatMessage[] {
  return messages.map((m) => {
    if (m.role === 'assistant') {
      return { role: 'assistant', content: m.content }
    }
    return { role: m.role, content: m.content }
  })
}

function mapTools(tools: AiTool[]): OrTool[] {
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }))
}

function safeParseJson(raw: string): unknown {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function stringifyToolOutput(output: unknown): string {
  if (typeof output === 'string') return output
  try {
    return JSON.stringify(output)
  } catch {
    return String(output)
  }
}

async function runToolCalls(
  toolCalls: OrFunctionToolCall[],
  tools: AiTool[],
  signal: AbortSignal | undefined,
): Promise<{ resultMessages: OrChatMessage[]; calls: AiToolCall[] }> {
  const resultMessages: OrChatMessage[] = []
  const calls: AiToolCall[] = []

  for (const call of toolCalls) {
    const tool = tools.find((t) => t.name === call.function.name)
    const input = safeParseJson(call.function.arguments)
    let output: unknown
    let isError = false

    if (!tool) {
      output = { message: `Unknown tool: ${call.function.name}` }
      isError = true
    } else {
      try {
        output = await tool.handler(input, { signal })
      } catch (err) {
        output = { message: err instanceof Error ? err.message : String(err) }
        isError = true
      }
    }

    calls.push({
      id: call.id,
      name: call.function.name,
      input,
      output,
      isError: isError || undefined,
    })
    resultMessages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: stringifyToolOutput(output),
    })
  }

  return { resultMessages, calls }
}

async function* parseSse(
  response: Response,
  signal: AbortSignal | undefined,
): AsyncGenerator<OrStreamEvent> {
  if (!response.body) {
    throw new Error('OpenRouter stream response has no body')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        for (const line of rawEvent.split('\n')) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload) continue
          if (payload === '[DONE]') return
          try {
            yield JSON.parse(payload) as OrStreamEvent
          } catch {
            // Skip malformed SSE payloads.
          }
        }
        boundary = buffer.indexOf('\n\n')
      }
    }
  } finally {
    try {
      reader.releaseLock()
    } catch {
      // releaseLock throws if the reader was cancelled mid-read; ignore.
    }
  }
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text()
    if (!text) return `${response.status} ${response.statusText}`
    try {
      const parsed: unknown = JSON.parse(text)
      if (
        parsed &&
        typeof parsed === 'object' &&
        'error' in parsed &&
        parsed.error &&
        typeof parsed.error === 'object' &&
        'message' in parsed.error &&
        typeof parsed.error.message === 'string'
      ) {
        return parsed.error.message
      }
    } catch {
      // Not JSON — fall back to raw text.
    }
    return text
  } catch {
    return `${response.status} ${response.statusText}`
  }
}

export class OpenRouterService implements AiService {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly defaultModel: string | undefined
  private readonly extraHeaders: Record<string, string>

  constructor(options: OpenRouterServiceOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
    this.defaultModel = options.defaultModel
    this.extraHeaders = {}
    if (options.referer) this.extraHeaders['HTTP-Referer'] = options.referer
    if (options.title) this.extraHeaders['X-Title'] = options.title
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...this.extraHeaders,
    }
  }

  private async post(
    body: object,
    signal: AbortSignal | undefined,
  ): Promise<Response> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      signal,
    })
    if (!response.ok) {
      const message = await readErrorBody(response)
      throw new Error(
        `OpenRouter request failed (${response.status}): ${message}`,
      )
    }
    return response
  }

  async chat(options: AiChatOptions): Promise<AiChatResult> {
    const tools = options.tools ?? []
    const maxIterations =
      options.maxToolIterations ?? DEFAULT_MAX_TOOL_ITERATIONS
    const model = options.model ?? this.defaultModel
    if (!model) {
      throw new Error('OpenRouterService.chat: model is required')
    }
    const messages: OrChatMessage[] = mapMessages(options.messages)

    const usage: OrUsage = { prompt_tokens: 0, completion_tokens: 0 }
    const toolCalls: AiToolCall[] = []
    let text = ''
    let responseModel = model
    let finishReason: string | null = null

    for (let iter = 0; iter < maxIterations; iter++) {
      const response = await this.post(
        {
          model,
          messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          tools: tools.length > 0 ? mapTools(tools) : undefined,
        },
        options.signal,
      )

      const data = (await response.json()) as OrResponse
      if (data.error) {
        throw new Error(`OpenRouter error: ${data.error.message ?? 'unknown'}`)
      }
      const choice = data.choices?.[0]
      if (!choice) {
        throw new Error('OpenRouter response had no choices')
      }
      if (data.usage) {
        usage.prompt_tokens += data.usage.prompt_tokens
        usage.completion_tokens += data.usage.completion_tokens
      }
      responseModel = data.model ?? model
      finishReason = choice.finish_reason
      text = choice.message.content ?? ''

      const requestedCalls = choice.message.tool_calls ?? []
      if (requestedCalls.length === 0) {
        return {
          content: text,
          model: responseModel,
          finishReason: mapFinishReason(finishReason),
          usage: mapUsage(usage),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        }
      }

      if (iter === maxIterations - 1) {
        return {
          content: text,
          model: responseModel,
          finishReason: 'tool_max_iterations',
          usage: mapUsage(usage),
          toolCalls,
        }
      }

      messages.push({
        role: 'assistant',
        content: choice.message.content,
        tool_calls: requestedCalls,
      })
      const { resultMessages, calls } = await runToolCalls(
        requestedCalls,
        tools,
        options.signal,
      )
      toolCalls.push(...calls)
      messages.push(...resultMessages)
    }

    return {
      content: text,
      model: responseModel,
      finishReason: 'tool_max_iterations',
      usage: mapUsage(usage),
      toolCalls,
    }
  }

  stream(options: AiChatOptions): AsyncIterable<AiStreamChunk> {
    const post = this.post.bind(this)
    const defaultModel = this.defaultModel
    return {
      async *[Symbol.asyncIterator]() {
        const tools = options.tools ?? []
        const maxIterations =
          options.maxToolIterations ?? DEFAULT_MAX_TOOL_ITERATIONS
        const model = options.model ?? defaultModel
        if (!model) {
          throw new Error('OpenRouterService.stream: model is required')
        }
        const messages: OrChatMessage[] = mapMessages(options.messages)

        const usage: OrUsage = { prompt_tokens: 0, completion_tokens: 0 }
        const toolCalls: AiToolCall[] = []
        let text = ''
        let responseModel = model
        let finishReason: string | null = null

        for (let iter = 0; iter < maxIterations; iter++) {
          const response = await post(
            {
              model,
              messages,
              temperature: options.temperature,
              max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
              tools: tools.length > 0 ? mapTools(tools) : undefined,
              stream: true,
              stream_options: { include_usage: true },
            },
            options.signal,
          )

          let accText = ''
          const callsByIndex = new Map<
            number,
            {
              id: string
              name: string
              args: string
            }
          >()

          for await (const event of parseSse(response, options.signal)) {
            if (event.error) {
              throw new Error(
                `OpenRouter stream error: ${event.error.message ?? 'unknown'}`,
              )
            }
            if (event.model) responseModel = event.model
            if (event.usage) {
              usage.prompt_tokens += event.usage.prompt_tokens
              usage.completion_tokens += event.usage.completion_tokens
            }
            const choice = event.choices?.[0]
            if (!choice) continue

            const deltaContent = choice.delta?.content
            if (typeof deltaContent === 'string' && deltaContent.length > 0) {
              accText += deltaContent
              yield { delta: deltaContent, done: false }
            }

            const deltaCalls = choice.delta?.tool_calls
            if (deltaCalls) {
              for (const part of deltaCalls) {
                const existing = callsByIndex.get(part.index) ?? {
                  id: '',
                  name: '',
                  args: '',
                }
                if (part.id) existing.id = part.id
                if (part.function?.name) existing.name = part.function.name
                if (part.function?.arguments) {
                  existing.args += part.function.arguments
                }
                callsByIndex.set(part.index, existing)
              }
            }

            if (choice.finish_reason) {
              finishReason = choice.finish_reason
            }
          }

          text = accText

          const indices = [...callsByIndex.keys()].sort((a, b) => a - b)
          const requestedCalls: OrFunctionToolCall[] = indices.map((idx) => {
            const c = callsByIndex.get(idx)!
            return {
              id: c.id || `call_${idx}`,
              type: 'function',
              function: { name: c.name, arguments: c.args },
            }
          })

          if (requestedCalls.length === 0) {
            const result: AiChatResult = {
              content: text,
              model: responseModel,
              finishReason: mapFinishReason(finishReason),
              usage: mapUsage(usage),
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            }
            yield { delta: '', done: true, result }
            return
          }

          if (iter === maxIterations - 1) {
            const result: AiChatResult = {
              content: text,
              model: responseModel,
              finishReason: 'tool_max_iterations',
              usage: mapUsage(usage),
              toolCalls,
            }
            yield { delta: '', done: true, result }
            return
          }

          messages.push({
            role: 'assistant',
            content: text.length > 0 ? text : null,
            tool_calls: requestedCalls,
          })
          const { resultMessages, calls } = await runToolCalls(
            requestedCalls,
            tools,
            options.signal,
          )
          toolCalls.push(...calls)
          messages.push(...resultMessages)
        }

        const result: AiChatResult = {
          content: text,
          model: responseModel,
          finishReason: 'tool_max_iterations',
          usage: mapUsage(usage),
          toolCalls,
        }
        yield { delta: '', done: true, result }
      },
    }
  }

  async generateObject<T>(
    options: AiStructuredOptions<T>,
  ): Promise<AiStructuredResult<T>> {
    const model = options.model ?? this.defaultModel
    if (!model) {
      throw new Error('OpenRouterService.generateObject: model is required')
    }
    const response = await this.post(
      {
        model,
        messages: mapMessages(options.messages),
        temperature: options.temperature,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'structured_output',
            strict: true,
            schema: options.schema,
          },
        },
      },
      options.signal,
    )

    const data = (await response.json()) as OrResponse
    if (data.error) {
      throw new Error(`OpenRouter error: ${data.error.message ?? 'unknown'}`)
    }
    const choice = data.choices?.[0]
    if (!choice) {
      throw new Error('OpenRouter response had no choices')
    }
    const content = choice.message.content ?? ''
    const parsed = JSON.parse(content) as T

    const raw: AiChatResult = {
      content,
      model: data.model ?? model,
      finishReason: mapFinishReason(choice.finish_reason),
      usage: mapUsage(data.usage),
    }
    return { data: parsed, raw }
  }
}

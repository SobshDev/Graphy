import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import type {
  ContentBlock,
  MessageParam,
  StopReason,
  Tool,
  ToolResultBlockParam,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/messages/messages'
import type {
  AiChatOptions,
  AiChatResult,
  AiService,
  AiStreamChunk,
  AiStructuredOptions,
  AiStructuredResult,
  AiToolCall,
  AiToolDefinition,
  AiToolResult,
  AiUsage,
} from './ai.interface'
import { DEFAULT_MAX_TOOL_ROUNDS } from './ai.interface'
import { splitSystem } from './messages.util'

export interface ClaudeServiceOptions {
  apiKey: string
  defaultModel?: string
  baseUrl?: string
}

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 4096

function mapFinishReason(
  reason: StopReason | null,
): AiChatResult['finishReason'] {
  if (reason === 'end_turn') return 'stop'
  if (reason === 'max_tokens') return 'length'
  if (reason === 'refusal') return 'content_filter'
  return reason ?? undefined
}

function extractText(content: ContentBlock[]): string {
  return content
    .filter(
      (block): block is Extract<ContentBlock, { type: 'text' }> =>
        block.type === 'text',
    )
    .map((block) => block.text)
    .join('')
}

function mapUsage(usage: {
  input_tokens: number
  output_tokens: number
}): AiUsage {
  return {
    promptTokens: usage.input_tokens,
    completionTokens: usage.output_tokens,
    totalTokens: usage.input_tokens + usage.output_tokens,
  }
}

function toAnthropicTools(tools: Array<AiToolDefinition<any, any>>): Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Tool['input_schema'],
  }))
}

function stringifyResult(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

async function runExecutor(
  tool: AiToolDefinition<any, any> | undefined,
  block: ToolUseBlock,
  signal: AbortSignal | undefined,
): Promise<AiToolResult> {
  if (!tool) {
    return {
      id: block.id,
      name: block.name,
      content: `unknown tool: ${block.name}`,
      isError: true,
    }
  }
  try {
    const value = await tool.execute(block.input, { signal })
    return {
      id: block.id,
      name: block.name,
      content: stringifyResult(value),
      isError: false,
    }
  } catch (err) {
    return {
      id: block.id,
      name: block.name,
      content: err instanceof Error ? err.message : String(err),
      isError: true,
    }
  }
}

function toolResultsToUserMessage(results: AiToolResult[]): MessageParam {
  const blocks: ToolResultBlockParam[] = results.map((r) => ({
    type: 'tool_result',
    tool_use_id: r.id,
    content: r.content,
    is_error: r.isError,
  }))
  return { role: 'user', content: blocks }
}

function addUsage(a: AiUsage | undefined, b: AiUsage): AiUsage {
  if (!a) return b
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  }
}

export class ClaudeService implements AiService {
  private readonly client: Anthropic
  private readonly defaultModel: string

  constructor(options: ClaudeServiceOptions) {
    this.client = new Anthropic({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
    })
    this.defaultModel = options.defaultModel ?? DEFAULT_MODEL
  }

  async chat(options: AiChatOptions): Promise<AiChatResult> {
    const { system, rest } = splitSystem(options.messages)
    const toolMap = new Map(options.tools?.map((t) => [t.name, t]) ?? [])
    const anthropicTools =
      options.tools && options.tools.length > 0
        ? toAnthropicTools(options.tools)
        : undefined
    const maxRounds = options.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS

    const working: MessageParam[] = rest.map((m) => ({
      role: m.role,
      content: m.content,
    }))
    const toolCalls: Array<{ call: AiToolCall; result: AiToolResult }> = []
    let totalUsage: AiUsage | undefined

    for (let round = 0; round <= maxRounds; round++) {
      const message = await this.client.messages.create(
        {
          model: options.model ?? this.defaultModel,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          temperature: options.temperature,
          system,
          messages: working,
          tools: anthropicTools,
        },
        { signal: options.signal },
      )
      totalUsage = addUsage(totalUsage, mapUsage(message.usage))

      if (message.stop_reason !== 'tool_use') {
        return {
          content: extractText(message.content),
          model: message.model,
          finishReason: mapFinishReason(message.stop_reason),
          usage: totalUsage,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        }
      }

      // record assistant turn (full content array with tool_use blocks)
      working.push({ role: 'assistant', content: message.content })

      const toolUses = message.content.filter(
        (b): b is ToolUseBlock => b.type === 'tool_use',
      )
      const results: AiToolResult[] = []
      for (const block of toolUses) {
        const call: AiToolCall = {
          id: block.id,
          name: block.name,
          args: block.input,
        }
        const result = await runExecutor(
          toolMap.get(block.name),
          block,
          options.signal,
        )
        toolCalls.push({ call, result })
        results.push(result)
      }
      working.push(toolResultsToUserMessage(results))
    }

    // Cap reached — Task 6 will fill this in with a forced final turn.
    throw new Error('maxToolRounds exceeded — implemented in Task 6')
  }

  stream(options: AiChatOptions): AsyncIterable<AiStreamChunk> {
    const client = this.client
    const defaultModel = this.defaultModel
    return {
      async *[Symbol.asyncIterator]() {
        const { system, rest } = splitSystem(options.messages)
        const stream = client.messages.stream(
          {
            model: options.model ?? defaultModel,
            max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
            temperature: options.temperature,
            system,
            messages: rest.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          },
          { signal: options.signal },
        )

        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              yield { delta: event.delta.text, done: false }
            }
          }
          yield { delta: '', done: true }
        } finally {
          stream.abort()
        }
      },
    }
  }

  async generateObject<T>(
    options: AiStructuredOptions<T>,
  ): Promise<AiStructuredResult<T>> {
    const { system, rest } = splitSystem(options.messages)
    const message = await this.client.messages.parse(
      {
        model: options.model ?? this.defaultModel,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: options.temperature,
        system,
        messages: rest.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        output_config: {
          format: jsonSchemaOutputFormat(
            options.schema as Parameters<typeof jsonSchemaOutputFormat>[0],
          ),
        },
      },
      { signal: options.signal },
    )

    const raw: AiChatResult = {
      content: extractText(message.content),
      model: message.model,
      finishReason: mapFinishReason(message.stop_reason),
      usage: mapUsage(message.usage),
    }

    return {
      data: message.parsed_output as T,
      raw,
    }
  }
}

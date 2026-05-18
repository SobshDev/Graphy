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
  AiUsage,
} from './ai.interface'
import { splitSystem } from './messages.util'
import type { AiTool, AiToolCall } from './tools/tools.interface'

export interface ClaudeServiceOptions {
  apiKey: string
  defaultModel?: string
  baseUrl?: string
}

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_MAX_TOOL_ITERATIONS = 8

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

interface RawUsage {
  input_tokens: number
  output_tokens: number
}

function mapUsage(usage: RawUsage): AiUsage {
  return {
    promptTokens: usage.input_tokens,
    completionTokens: usage.output_tokens,
    totalTokens: usage.input_tokens + usage.output_tokens,
  }
}

function mapTools(tools: AiTool[]): Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Tool['input_schema'],
  }))
}

function stringifyToolOutput(output: unknown): string {
  if (typeof output === 'string') return output
  try {
    return JSON.stringify(output)
  } catch {
    return String(output)
  }
}

async function runToolBlocks(
  blocks: ToolUseBlock[],
  tools: AiTool[],
  signal: AbortSignal | undefined,
): Promise<{
  resultBlocks: ToolResultBlockParam[]
  calls: AiToolCall[]
}> {
  const resultBlocks: ToolResultBlockParam[] = []
  const calls: AiToolCall[] = []

  for (const block of blocks) {
    const tool = tools.find((t) => t.name === block.name)
    let output: unknown
    let isError = false

    if (!tool) {
      output = { message: `Unknown tool: ${block.name}` }
      isError = true
    } else {
      try {
        output = await tool.handler(block.input, { signal })
      } catch (err) {
        output = { message: err instanceof Error ? err.message : String(err) }
        isError = true
      }
    }

    calls.push({
      id: block.id,
      name: block.name,
      input: block.input,
      output,
      isError: isError || undefined,
    })
    resultBlocks.push({
      type: 'tool_result',
      tool_use_id: block.id,
      content: stringifyToolOutput(output),
      is_error: isError || undefined,
    })
  }

  return { resultBlocks, calls }
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
    const tools = options.tools ?? []
    const maxIterations =
      options.maxToolIterations ?? DEFAULT_MAX_TOOL_ITERATIONS
    const { system, rest } = splitSystem(options.messages)
    const messages: MessageParam[] = rest.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const usage: RawUsage = { input_tokens: 0, output_tokens: 0 }
    const toolCalls: AiToolCall[] = []
    let text = ''
    let model = ''
    let stopReason: StopReason | null = null

    for (let iter = 0; iter < maxIterations; iter++) {
      const response = await this.client.messages.create(
        {
          model: options.model ?? this.defaultModel,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          temperature: options.temperature,
          system,
          messages,
          tools: tools.length > 0 ? mapTools(tools) : undefined,
        },
        { signal: options.signal },
      )

      usage.input_tokens += response.usage.input_tokens
      usage.output_tokens += response.usage.output_tokens
      model = response.model
      stopReason = response.stop_reason
      text = extractText(response.content)

      const toolUseBlocks = response.content.filter(
        (b): b is ToolUseBlock => b.type === 'tool_use',
      )

      if (toolUseBlocks.length === 0) {
        return {
          content: text,
          model,
          finishReason: mapFinishReason(stopReason),
          usage: mapUsage(usage),
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        }
      }

      if (iter === maxIterations - 1) {
        return {
          content: text,
          model,
          finishReason: 'tool_max_iterations',
          usage: mapUsage(usage),
          toolCalls,
        }
      }

      messages.push({ role: 'assistant', content: response.content })
      const { resultBlocks, calls } = await runToolBlocks(
        toolUseBlocks,
        tools,
        options.signal,
      )
      toolCalls.push(...calls)
      messages.push({ role: 'user', content: resultBlocks })
    }

    return {
      content: text,
      model,
      finishReason: 'tool_max_iterations',
      usage: mapUsage(usage),
      toolCalls,
    }
  }

  stream(options: AiChatOptions): AsyncIterable<AiStreamChunk> {
    const client = this.client
    const defaultModel = this.defaultModel
    return {
      async *[Symbol.asyncIterator]() {
        const tools = options.tools ?? []
        const maxIterations =
          options.maxToolIterations ?? DEFAULT_MAX_TOOL_ITERATIONS
        const { system, rest } = splitSystem(options.messages)
        const messages: MessageParam[] = rest.map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const usage: RawUsage = { input_tokens: 0, output_tokens: 0 }
        const toolCalls: AiToolCall[] = []
        let text = ''
        let model = ''
        let stopReason: StopReason | null = null

        for (let iter = 0; iter < maxIterations; iter++) {
          const stream = client.messages.stream(
            {
              model: options.model ?? defaultModel,
              max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
              temperature: options.temperature,
              system,
              messages,
              tools: tools.length > 0 ? mapTools(tools) : undefined,
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

            const finalMessage = await stream.finalMessage()
            usage.input_tokens += finalMessage.usage.input_tokens
            usage.output_tokens += finalMessage.usage.output_tokens
            model = finalMessage.model
            stopReason = finalMessage.stop_reason
            text = extractText(finalMessage.content)

            const toolUseBlocks = finalMessage.content.filter(
              (b): b is ToolUseBlock => b.type === 'tool_use',
            )

            if (toolUseBlocks.length === 0) {
              const result: AiChatResult = {
                content: text,
                model,
                finishReason: mapFinishReason(stopReason),
                usage: mapUsage(usage),
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
              }
              yield { delta: '', done: true, result }
              return
            }

            if (iter === maxIterations - 1) {
              const result: AiChatResult = {
                content: text,
                model,
                finishReason: 'tool_max_iterations',
                usage: mapUsage(usage),
                toolCalls,
              }
              yield { delta: '', done: true, result }
              return
            }

            messages.push({ role: 'assistant', content: finalMessage.content })
            const { resultBlocks, calls } = await runToolBlocks(
              toolUseBlocks,
              tools,
              options.signal,
            )
            toolCalls.push(...calls)
            messages.push({ role: 'user', content: resultBlocks })
          } finally {
            stream.abort()
          }
        }

        const result: AiChatResult = {
          content: text,
          model,
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

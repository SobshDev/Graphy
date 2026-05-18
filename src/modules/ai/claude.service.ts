import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import type {
  ContentBlock,
  StopReason,
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
    const message = await this.client.messages.create(
      {
        model: options.model ?? this.defaultModel,
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

    return {
      content: extractText(message.content),
      model: message.model,
      finishReason: mapFinishReason(message.stop_reason),
      usage: mapUsage(message.usage),
    }
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

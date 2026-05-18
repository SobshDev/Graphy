import { Codex } from '@openai/codex-sdk'
import type { Usage } from '@openai/codex-sdk'
import type {
  AiChatOptions,
  AiChatResult,
  AiService,
  AiStreamChunk,
  AiStructuredOptions,
  AiStructuredResult,
  AiUsage,
} from './ai.interface'
import { flattenToPrompt } from './messages.util'

export interface CodexServiceOptions {
  apiKey: string
  defaultModel?: string
  baseUrl?: string
}

function mapUsage(usage: Usage | null): AiUsage | undefined {
  if (!usage) return undefined
  return {
    promptTokens: usage.input_tokens,
    completionTokens: usage.output_tokens,
    totalTokens: usage.input_tokens + usage.output_tokens,
  }
}

/**
 * Codex provider, backed by `@openai/codex-sdk`.
 *
 * The SDK spawns the local `codex` CLI as a subprocess and exchanges
 * JSONL events over stdin/stdout. This service is therefore Node-only —
 * instantiating it in a browser/renderer context will fail when the SDK
 * attempts to spawn the subprocess.
 *
 * Each AiService call starts a fresh Codex thread (the interface is
 * stateless; Codex threads are not). Multi-turn message history is
 * flattened into a single prompt via `flattenToPrompt`.
 */
export class CodexService implements AiService {
  private readonly codex: Codex
  private readonly defaultModel: string | undefined
  private toolsWarned = false

  constructor(options: CodexServiceOptions) {
    this.codex = new Codex({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
    })
    this.defaultModel = options.defaultModel
  }

  /**
   * The Codex SDK has no per-turn tool-declaration API: TurnOptions only
   * accepts `outputSchema` and `signal`. Custom tools are configured
   * out-of-band via MCP servers in the CLI config. To avoid breaking callers
   * that pass `tools` for Claude, we silently ignore them here and warn once
   * per service instance.
   */
  private warnUnsupportedTools(tools: AiChatOptions['tools']): void {
    if (!tools || tools.length === 0) return
    if (this.toolsWarned) return
    this.toolsWarned = true
    console.warn(
      '[CodexService] tools[] is ignored: the Codex SDK has no per-turn tool-declaration API. Configure custom tools as MCP servers on the Codex CLI instead.',
    )
  }

  async chat(options: AiChatOptions): Promise<AiChatResult> {
    this.warnUnsupportedTools(options.tools)
    const prompt = flattenToPrompt(options.messages)
    const model = options.model ?? this.defaultModel
    const thread = this.codex.startThread(model ? { model } : undefined)
    const turn = await thread.run(prompt, { signal: options.signal })
    return {
      content: turn.finalResponse,
      model: options.model ?? this.defaultModel ?? '',
      finishReason: 'stop',
      usage: mapUsage(turn.usage),
    }
  }

  stream(options: AiChatOptions): AsyncIterable<AiStreamChunk> {
    this.warnUnsupportedTools(options.tools)
    const codex = this.codex
    const defaultModel = this.defaultModel
    return {
      async *[Symbol.asyncIterator]() {
        const prompt = flattenToPrompt(options.messages)
        const model = options.model ?? defaultModel
        const thread = codex.startThread(model ? { model } : undefined)
        const { events } = await thread.runStreamed(prompt, {
          signal: options.signal,
        })

        for await (const event of events) {
          if (event.type === 'item.completed') {
            if (event.item.type === 'agent_message') {
              yield { delta: event.item.text, done: false }
            }
          }
          if (event.type === 'turn.completed') {
            break
          }
        }
        yield { delta: '', done: true }
      },
    }
  }

  async generateObject<T>(
    options: AiStructuredOptions<T>,
  ): Promise<AiStructuredResult<T>> {
    const prompt = flattenToPrompt(options.messages)
    const model = options.model ?? this.defaultModel
    const thread = this.codex.startThread(model ? { model } : undefined)
    const turn = await thread.run(prompt, {
      outputSchema: options.schema,
      signal: options.signal,
    })

    const data = JSON.parse(turn.finalResponse) as T
    const raw: AiChatResult = {
      content: turn.finalResponse,
      model: options.model ?? this.defaultModel ?? '',
      finishReason: 'stop',
      usage: mapUsage(turn.usage),
    }
    return { data, raw }
  }
}

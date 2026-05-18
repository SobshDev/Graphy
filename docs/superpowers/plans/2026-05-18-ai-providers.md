# AI Providers (Claude + Codex) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two concrete `AiService` implementations — `ClaudeService` (Anthropic Messages API) and `CodexService` (Codex CLI SDK) — wired through a shared message-shaping util, both configured purely via constructor options.

**Architecture:** Two stateless classes in `src/modules/ai/`. `ClaudeService` maps directly onto Anthropic's stateless `messages.*` endpoints. `CodexService` flattens each call's message array into a single prompt and starts a fresh Codex SDK thread per call (the SDK is thread-based; the interface is not). A small pure helper file handles message reshaping. No env-var fallback inside the classes, no tests in this iteration, no IPC/server wiring — just the classes.

**Tech Stack:** TypeScript (strict), Bun, Vite, `@anthropic-ai/sdk`, `@openai/codex-sdk`.

**Spec:** `docs/superpowers/specs/2026-05-18-ai-providers-design.md`

**Code style:** Prettier config is `semi: false`, `singleQuote: true`, `trailingComma: 'all'`. Match that in new files.

---

## Task 1: Install SDK dependencies

**Files:**
- Modify: `package.json` (dependencies block)
- Modify: `bun.lock`

- [ ] **Step 1: Install both SDKs as runtime dependencies**

Run from repo root:

```bash
bun add @anthropic-ai/sdk @openai/codex-sdk
```

- [ ] **Step 2: Verify the packages resolved**

Run:

```bash
ls node_modules/@anthropic-ai/sdk/package.json node_modules/@openai/codex-sdk/package.json
```

Expected: both paths exist (no "No such file" error).

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore(ai): add @anthropic-ai/sdk and @openai/codex-sdk"
```

---

## Task 2: Shared message helpers

**Files:**
- Create: `src/modules/ai/messages.util.ts`

- [ ] **Step 1: Create `messages.util.ts` with both helpers**

Write `src/modules/ai/messages.util.ts`:

```ts
import type { AiMessage } from './ai.interface'

export interface SplitMessages {
  system: string | undefined
  rest: AiMessage[]
}

export function splitSystem(messages: AiMessage[]): SplitMessages {
  const systemParts: string[] = []
  const rest: AiMessage[] = []
  for (const message of messages) {
    if (message.role === 'system') {
      systemParts.push(message.content)
    } else {
      rest.push(message)
    }
  }
  return {
    system: systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
    rest,
  }
}

export function flattenToPrompt(messages: AiMessage[]): string {
  const { system, rest } = splitSystem(messages)
  const parts: string[] = []
  if (system) parts.push(system)
  for (const message of rest) {
    const label = message.role === 'user' ? 'User' : 'Assistant'
    parts.push(`${label}: ${message.content}`)
  }
  return parts.join('\n\n')
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
bun x tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/ai/messages.util.ts
git commit -m "feat(ai): add message-shaping helpers for providers"
```

---

## Task 3: `ClaudeService`

**Files:**
- Create: `src/modules/ai/claude.service.ts`

- [ ] **Step 1: Write the full `ClaudeService` implementation**

Write `src/modules/ai/claude.service.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
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

type AnthropicStopReason = string | null | undefined

function mapFinishReason(
  reason: AnthropicStopReason,
): AiChatResult['finishReason'] {
  if (reason === 'end_turn') return 'stop'
  if (reason === 'max_tokens') return 'length'
  if (reason === 'refusal') return 'content_filter'
  return reason ?? undefined
}

function extractText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
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
        messages: rest.map((m) => ({ role: m.role, content: m.content })),
      },
      { signal: options.signal },
    )

    return {
      content: extractText(
        message.content as Array<{ type: string; text?: string }>,
      ),
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
            messages: rest.map((m) => ({ role: m.role, content: m.content })),
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
        messages: rest.map((m) => ({ role: m.role, content: m.content })),
        output_config: { format: jsonSchemaOutputFormat(options.schema) },
      },
      { signal: options.signal },
    )

    const raw: AiChatResult = {
      content: extractText(
        message.content as Array<{ type: string; text?: string }>,
      ),
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
```

- [ ] **Step 2: Type-check**

Run:

```bash
bun x tsc --noEmit
```

Expected: no errors. If the SDK's actual types disagree with the casts (e.g. `content` block shape, `jsonSchemaOutputFormat` import path, `messages.parse` signature), adjust to the actual types — do not loosen with `any`. Cross-check against `node_modules/@anthropic-ai/sdk` typings if the SDK has moved a symbol since this plan was written.

- [ ] **Step 3: Commit**

```bash
git add src/modules/ai/claude.service.ts
git commit -m "feat(ai): add ClaudeService using @anthropic-ai/sdk"
```

---

## Task 4: `CodexService`

**Files:**
- Create: `src/modules/ai/codex.service.ts`

- [ ] **Step 1: Write the full `CodexService` implementation**

Write `src/modules/ai/codex.service.ts`:

```ts
import { Codex } from '@openai/codex-sdk'
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

interface CodexTurnUsage {
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
}

function mapUsage(usage: CodexTurnUsage | undefined): AiUsage | undefined {
  if (!usage) return undefined
  const prompt = usage.input_tokens ?? 0
  const completion = usage.output_tokens ?? 0
  return {
    promptTokens: prompt,
    completionTokens: completion,
    totalTokens: usage.total_tokens ?? prompt + completion,
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

  constructor(options: CodexServiceOptions) {
    this.codex = new Codex({
      env: {
        ...process.env,
        CODEX_API_KEY: options.apiKey,
        ...(options.baseUrl ? { OPENAI_BASE_URL: options.baseUrl } : {}),
      },
      config: options.defaultModel ? { model: options.defaultModel } : undefined,
    })
    this.defaultModel = options.defaultModel
  }

  async chat(options: AiChatOptions): Promise<AiChatResult> {
    const prompt = flattenToPrompt(options.messages)
    const thread = this.codex.startThread()
    const turn = await thread.run(prompt)
    return {
      content: turn.finalResponse,
      model: options.model ?? this.defaultModel ?? '',
      finishReason: 'stop',
      usage: mapUsage(turn.usage as CodexTurnUsage | undefined),
    }
  }

  stream(options: AiChatOptions): AsyncIterable<AiStreamChunk> {
    const codex = this.codex
    return {
      async *[Symbol.asyncIterator]() {
        const prompt = flattenToPrompt(options.messages)
        const thread = codex.startThread()
        const { events } = await thread.runStreamed(prompt)

        for await (const event of events) {
          if (event.type === 'item.completed') {
            const item = (event as { item?: { text?: string } }).item
            if (item?.text) {
              yield { delta: item.text, done: false }
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
    const thread = this.codex.startThread()
    const turn = await thread.run(prompt, { outputSchema: options.schema })

    const data = JSON.parse(turn.finalResponse) as T
    const raw: AiChatResult = {
      content: turn.finalResponse,
      model: options.model ?? this.defaultModel ?? '',
      finishReason: 'stop',
      usage: mapUsage(turn.usage as CodexTurnUsage | undefined),
    }
    return { data, raw }
  }
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
bun x tsc --noEmit
```

Expected: no errors. If the SDK exposes typed event variants whose names differ from `item.completed` / `turn.completed`, adjust the discriminator strings to the real values (peek at `node_modules/@openai/codex-sdk` types). Keep narrowing — do not use `any`.

If the SDK's `Codex` constructor type does not accept `env` or `config` exactly as shown here, switch to whatever the typings allow (e.g. setting `process.env.CODEX_API_KEY` before construction). The semantic goal is: API key flows in via constructor option, never via env read inside the class.

- [ ] **Step 3: Commit**

```bash
git add src/modules/ai/codex.service.ts
git commit -m "feat(ai): add CodexService using @openai/codex-sdk"
```

---

## Task 5: Re-export from the module barrel

**Files:**
- Modify: `src/modules/ai/index.ts`

- [ ] **Step 1: Replace the contents of `index.ts`**

Overwrite `src/modules/ai/index.ts` with:

```ts
export * from './ai.interface'
export * from './messages.util'
export * from './claude.service'
export * from './codex.service'
```

- [ ] **Step 2: Type-check**

Run:

```bash
bun x tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/ai/index.ts
git commit -m "feat(ai): expose Claude and Codex services from module barrel"
```

---

## Task 6: Final lint + format pass

**Files:** all of `src/modules/ai/*`.

- [ ] **Step 1: Format the new files**

Run:

```bash
bun run format
```

Expected: prettier rewrites any style mismatches; ESLint --fix runs.

- [ ] **Step 2: Lint check**

Run:

```bash
bun run lint
```

Expected: no errors. If any appear, fix them — do not disable rules.

- [ ] **Step 3: Type-check**

Run:

```bash
bun x tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit (only if format/lint touched files)**

```bash
git status
# if anything is modified:
git add src/modules/ai
git commit -m "style(ai): apply prettier/eslint to AI provider modules"
```

If `git status` is clean, skip the commit.

---

## Done criteria

- `bun x tsc --noEmit` passes.
- `bun run lint` passes.
- `import { ClaudeService, CodexService } from '#/modules/ai'` resolves with the documented types.
- No tests added (deferred per spec).
- No app wiring (renderer/main/server routes) added (deferred per spec).

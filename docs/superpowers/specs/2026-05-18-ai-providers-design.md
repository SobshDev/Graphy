# AI Providers — Claude and Codex implementations of `AiService`

Date: 2026-05-18
Status: Approved

## Goal

Provide two concrete implementations of the existing `AiService` interface at `src/modules/ai/ai.interface.ts`:

- `ClaudeService` — backed by `@anthropic-ai/sdk` (Anthropic Messages API).
- `CodexService` — backed by `@openai/codex-sdk` (Codex CLI wrapper).

Both classes implement `chat`, `stream`, and `generateObject` exactly as defined in the interface. No new public types beyond what the interface already exposes.

## Non-goals

- No env-var fallback for configuration (constructor options only).
- No automated tests in this iteration.
- No retry / backoff wrapper (SDKs already retry).
- No tool-use, multimodal, thinking, or beta-feature surfaces — the interface does not expose them.
- No factory or provider registry — the caller instantiates whichever class they want.
- No thread persistence for Codex — the interface is stateless, so each call starts a fresh thread.
- No IPC, no server functions, no route handlers — wiring into the app is left for a later task.

## File layout

```
src/modules/ai/
├── ai.interface.ts           (exists, unchanged)
├── index.ts                  (re-export interface + services)
├── messages.util.ts          (flattening + system-extraction helpers)
├── claude.service.ts         (ClaudeService implements AiService)
└── codex.service.ts          (CodexService implements AiService)
```

`index.ts` re-exports `ClaudeService`, `CodexService`, and the existing interface types.

## Shared helpers (`messages.util.ts`)

Two small pure functions, no I/O, no SDK imports.

- `splitSystem(messages: AiMessage[]): { system: string | undefined; rest: AiMessage[] }`
  Concatenates all `role: 'system'` messages with `\n\n` and removes them from the array. Used by `ClaudeService` because Anthropic takes `system` as a top-level param distinct from `messages`.
- `flattenToPrompt(messages: AiMessage[]): string`
  Produces a single string for Codex:

  ```
  <joined system messages>

  User: <content>

  Assistant: <content>

  User: <content>
  ```

  Empty when `messages` is empty. Used by `CodexService` because the Codex SDK accepts a single prompt string per `thread.run()` call.

## `ClaudeService`

### Constructor

```ts
new ClaudeService({
  apiKey: string,          // required — we do not silently fall back to env
  defaultModel?: string,   // defaults to 'claude-sonnet-4-6'
  baseUrl?: string,
})
```

Internally instantiates `new Anthropic({ apiKey, baseURL: baseUrl })`. `apiKey` is required at the type level to prevent silent fallback to `ANTHROPIC_API_KEY` (the SDK does read env vars when `apiKey` is omitted). Callers that want env-var behavior pass `process.env.ANTHROPIC_API_KEY!` explicitly.

### `chat(options)`

1. `const { system, rest } = splitSystem(options.messages)`.
2. Call `client.messages.create({ model: options.model ?? defaultModel, max_tokens: options.maxTokens ?? 4096, temperature: options.temperature, system, messages: rest }, { signal: options.signal })`.
3. Build `AiChatResult`:
   - `content`: join all text-typed blocks in `message.content` with empty string.
   - `model`: `message.model`.
   - `finishReason`: map Anthropic `stop_reason` (`end_turn` → `'stop'`, `max_tokens` → `'length'`, otherwise pass-through string).
   - `usage`: `{ promptTokens: usage.input_tokens, completionTokens: usage.output_tokens, totalTokens: input + output }`.

`max_tokens` defaults to `4096` because Anthropic requires it; the interface allows it to be omitted.

### `stream(options)`

Returns an `AsyncIterable<AiStreamChunk>`:

1. `const stream = client.messages.stream({ ...same params as chat... })`, passing `{ signal: options.signal }` via `setRequestOptions`.
2. `for await (const event of stream)`:
   - If `event.type === 'content_block_delta'` and `event.delta.type === 'text_delta'`, yield `{ delta: event.delta.text, done: false }`.
   - Ignore other event types.
3. After the loop, yield `{ delta: '', done: true }`.

Cancellation: `break` out of the consumer loop, or abort via `options.signal`. Both close the underlying stream.

### `generateObject<T>(options)`

1. `const { system, rest } = splitSystem(options.messages)`.
2. Call `client.messages.parse({ model, max_tokens, temperature, system, messages: rest, output_config: { format: jsonSchemaOutputFormat(options.schema) } }, { signal })` from `@anthropic-ai/sdk/helpers/json-schema`.
3. Return `{ data: msg.parsed_output as T, raw: <the same AiChatResult shape built in chat()> }`.

## `CodexService`

### Constructor

```ts
new CodexService({
  apiKey: string,          // required — we do not silently fall back to env
  defaultModel?: string,
  baseUrl?: string,
})
```

Internally instantiates `new Codex({ apiKey, baseUrl, config: defaultModel ? { model: defaultModel } : undefined })`. The Codex SDK passes `config` entries through to the CLI as repeated `--config key=value` flags. `apiKey` is required at the type level for the same reason as `ClaudeService` — to avoid silent reliance on env vars from inside the class.

### Runtime constraint

The Codex SDK spawns the `codex` CLI subprocess and exchanges JSONL over stdin/stdout. **Node only.** Documented in a JSDoc block on the class. Constructing in a browser/renderer context will fail when the SDK attempts to spawn the subprocess.

### `chat(options)`

1. `const prompt = flattenToPrompt(options.messages)`.
2. `const thread = codex.startThread()`.
3. `const turn = await thread.run(prompt)` — per-call model override, if `options.model` differs from `defaultModel`, is passed via the SDK's `config` option on a per-call basis (per the Codex SDK's docs, model selection happens through CLI config overrides).
4. Build `AiChatResult`:
   - `content`: `turn.finalResponse`.
   - `model`: `options.model ?? defaultModel ?? ''` (empty string when the caller did not specify and no default was set — the Codex CLI picks its own default and the SDK does not surface it on the turn object).
   - `finishReason`: `'stop'`.
   - `usage`: derived from `turn.usage` if present (Codex turns expose token totals).
5. AbortSignal: if `options.signal` is provided, attach an `abort` listener that calls the SDK's per-turn cancellation if exposed, otherwise lets the promise reject when the signal fires (best-effort — the subprocess may still be running until the CLI honors the abort).

### `stream(options)`

1. `const prompt = flattenToPrompt(options.messages)`.
2. `const { events } = thread.runStreamed(prompt)`.
3. `for await (const event of events)`:
   - On events carrying assistant text (per SDK event taxonomy — `item.completed` with a text payload, plus any in-flight `*.delta` events), yield `{ delta: <text>, done: false }`.
   - Other events (tool calls, file edit notifications) are ignored — the `AiStreamChunk` shape has no slot for them.
4. On `turn.completed`, yield `{ delta: '', done: true }`.

### `generateObject<T>(options)`

1. `const prompt = flattenToPrompt(options.messages)`.
2. `const turn = await thread.run(prompt, { outputSchema: options.schema })`.
3. Parse `turn.finalResponse` as JSON into `T`. Return `{ data, raw: <AiChatResult shape> }`.

The Codex SDK accepts a JSON Schema object directly for `outputSchema`; `options.schema` (typed as `object`) is forwarded unchanged.

## Error handling

No custom error wrapping. SDK errors propagate to the caller. The caller decides how to surface them.

## Dependencies to add

- `@anthropic-ai/sdk` (latest)
- `@openai/codex-sdk` (latest)
- `zod` is **not** added — we only use the JSON Schema helper, not the Zod helper.

Installed via Bun: `bun add @anthropic-ai/sdk @openai/codex-sdk`.

## Defaults

- `ClaudeService.defaultModel`: `'claude-sonnet-4-6'`.
- `CodexService.defaultModel`: unset (let the Codex CLI use its own default).
- `max_tokens` for Claude: `4096` when caller omits.
- Temperature: forwarded only when caller provides it.

## Open questions resolved during brainstorming

- "Codex" means the official `@openai/codex-sdk` (TypeScript SDK that wraps the `codex` CLI). Not the OpenAI Chat Completions API.
- Both services are plain classes; wiring (IPC, server functions, renderer use) is deferred.
- Configuration is constructor-only — no `process.env` fallback inside the services.
- No tests in this iteration.

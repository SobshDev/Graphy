# AI Tool Calling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tool calling to `AiService` so callers register `{ name, description, inputSchema, execute }` and the service runs the full tool-call loop on both Claude and Codex.

**Architecture:** Tool definitions, calls, and results are added to `ai.interface.ts`; the loop runs inside the service. Claude uses raw `messages.create` / `messages.stream` with per-round looping. Codex gets an in-process Streamable-HTTP MCP server hosted by Graphy, registered with Codex via `CodexOptions.config`. `AiStreamChunk` becomes a tagged union of `text` / `tool_call` / `tool_result` / `done` (breaking change).

**Tech Stack:** TypeScript 6, `@anthropic-ai/sdk` (already installed, v0.96), `@openai/codex-sdk` (already installed, v0.130), `@modelcontextprotocol/sdk` (new dep, target `^1.24`), Bun runtime, ESLint + Prettier.

**Reference spec:** `docs/superpowers/specs/2026-05-18-ai-tool-calling-design.md` — read this end-to-end before starting Task 1.

**Verification strategy (no test framework):** Each task's automated gate is `bun run lint` and `bunx tsc --noEmit`. Behavioral verification is a manual driver script under `scripts/ai-tool-calling-driver.ts` that the **user** runs at named **Milestones** (the executing agent must not run the driver, since it consumes API quota and needs keys).

**Branch:** `feat/ai-tool-calling` (already created off `main`, has the spec commit at `6b81010`). All commits in this plan stack on that branch.

---

### Task 1: Add the `@modelcontextprotocol/sdk` dependency

**Files:**
- Modify: `package.json`
- Regenerate: `bun.lock`

- [ ] **Step 1: Add the dependency**

Run:
```bash
bun add @modelcontextprotocol/sdk@^1.24.0
```
Expected: `package.json` `dependencies` gains `"@modelcontextprotocol/sdk": "^1.24.0"`; `bun.lock` regenerated.

- [ ] **Step 2: Verify install resolved**

Run:
```bash
bun pm ls @modelcontextprotocol/sdk
```
Expected: one entry, `@modelcontextprotocol/sdk@1.24.x` (or newer 1.x).

- [ ] **Step 3: Type-check baseline**

Run:
```bash
bunx tsc --noEmit
```
Expected: PASS (no new errors introduced by the dep).

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "chore(ai): add @modelcontextprotocol/sdk for Codex tool bridge"
```

---

### Task 2: Extend `ai.interface.ts` with tool types

This task only adds/modifies types. No service code changes yet — the compiler will flag the providers; that's expected and is fixed by later tasks.

**Files:**
- Modify: `src/modules/ai/ai.interface.ts`

- [ ] **Step 1: Replace the contents of `src/modules/ai/ai.interface.ts`**

```ts
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
  tools?: AiToolDefinition[]
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
```

- [ ] **Step 2: Type-check (expected to fail in service files only)**

Run:
```bash
bunx tsc --noEmit
```
Expected: errors **only** in `claude.service.ts` and `codex.service.ts` about the now-tagged-union `AiStreamChunk` (existing `yield { delta, done }` doesn't match). No errors in `ai.interface.ts` itself.

If errors appear elsewhere, stop and investigate before proceeding.

- [ ] **Step 3: Lint the interface file**

Run:
```bash
bun run lint -- src/modules/ai/ai.interface.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/ai/ai.interface.ts
git commit -m "feat(ai): add tool calling types to AiService interface"
```

---

### Task 3: Create the manual verification driver skeleton

The driver is a Node ESM script that exercises tool calling end-to-end. We create it now so each subsequent task can append a milestone case. The agent never runs it.

**Files:**
- Create: `scripts/ai-tool-calling-driver.ts`

- [ ] **Step 1: Create the driver skeleton**

Write `scripts/ai-tool-calling-driver.ts`:

```ts
/**
 * Manual verification driver for the AiService tool-calling feature.
 *
 * Runs the milestones from docs/superpowers/plans/2026-05-18-ai-tool-calling.md.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... OPENAI_API_KEY=... bun run scripts/ai-tool-calling-driver.ts <milestone>
 *
 *   <milestone> is one of:
 *     claude-single, claude-multi, claude-error, claude-cap,
 *     claude-stream, codex-single, codex-stream, codex-sandbox,
 *     reject-tools-with-schema, all
 */
import { ClaudeService, CodexService } from '../src/modules/ai/index'
import type { AiToolDefinition } from '../src/modules/ai/index'

const MILESTONES = {
  'claude-single': claudeSingle,
  'claude-multi': claudeMulti,
  'claude-error': claudeError,
  'claude-cap': claudeCap,
  'claude-stream': claudeStream,
  'codex-single': codexSingle,
  'codex-stream': codexStream,
  'codex-sandbox': codexSandbox,
  'reject-tools-with-schema': rejectToolsWithSchema,
}

async function claudeSingle() {
  throw new Error('not yet implemented — Task 4 fills this in')
}
async function claudeMulti() {
  throw new Error('not yet implemented — Task 5')
}
async function claudeError() {
  throw new Error('not yet implemented — Task 5')
}
async function claudeCap() {
  throw new Error('not yet implemented — Task 6')
}
async function claudeStream() {
  throw new Error('not yet implemented — Task 7')
}
async function codexSingle() {
  throw new Error('not yet implemented — Task 10')
}
async function codexStream() {
  throw new Error('not yet implemented — Task 11')
}
async function codexSandbox() {
  throw new Error('not yet implemented — Task 12')
}
async function rejectToolsWithSchema() {
  throw new Error('not yet implemented — Task 13')
}

async function main() {
  const arg = process.argv[2] ?? 'all'
  const targets =
    arg === 'all'
      ? Object.entries(MILESTONES)
      : ([[arg, MILESTONES[arg as keyof typeof MILESTONES]]] as const)
  if (!targets[0]?.[1]) {
    console.error(`Unknown milestone: ${arg}`)
    console.error(`Available: ${Object.keys(MILESTONES).join(', ')}, all`)
    process.exit(2)
  }
  for (const [name, fn] of targets) {
    console.log(`\n=== ${name} ===`)
    try {
      await fn()
      console.log(`OK: ${name}`)
    } catch (err) {
      console.error(`FAIL: ${name}`)
      console.error(err)
      process.exitCode = 1
    }
  }
}

// helpers reused by milestones
export function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`missing env: ${name}`)
  return v
}

export function makeReadGraphTool(): AiToolDefinition<
  { id: string },
  { id: string; label: string; neighbors: string[] }
> {
  const FIXTURE: Record<
    string,
    { id: string; label: string; neighbors: string[] }
  > = {
    'node-1': { id: 'node-1', label: 'main', neighbors: ['node-2', 'node-3'] },
    'node-2': { id: 'node-2', label: 'parseInput', neighbors: ['node-4'] },
    'node-3': { id: 'node-3', label: 'render', neighbors: [] },
    'node-4': { id: 'node-4', label: 'tokenize', neighbors: [] },
  }
  return {
    name: 'read_graph_node',
    description:
      'Read one graph node by id. Returns its label and immediate neighbor ids.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
    execute: ({ id }) => {
      const node = FIXTURE[id]
      if (!node) throw new Error(`unknown node id: ${id}`)
      return node
    },
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 2: Type-check the driver**

Run:
```bash
bunx tsc --noEmit
```
Expected: PASS (the milestone bodies just throw; types resolve via the interface).

- [ ] **Step 3: Lint the driver**

Run:
```bash
bun run lint -- scripts/ai-tool-calling-driver.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add scripts/ai-tool-calling-driver.ts
git commit -m "chore(ai): add manual driver skeleton for tool calling"
```

---

### Task 4: Claude `chat` — single-round tool calling

Implement the loop only for the case where the model calls tools once and then answers. Multi-round and edge cases come in Task 5–6.

**Files:**
- Modify: `src/modules/ai/claude.service.ts`
- Modify: `scripts/ai-tool-calling-driver.ts`

- [ ] **Step 1: Add tool-loop support to `chat`**

In `src/modules/ai/claude.service.ts`:

Update imports:
```ts
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
```

Add helpers above the class:
```ts
function toAnthropicTools(tools: AiToolDefinition[]): Tool[] {
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
  tool: AiToolDefinition | undefined,
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
    const value = await tool.execute(block.input as never, { signal })
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

function toolResultsToUserMessage(
  results: AiToolResult[],
): MessageParam {
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
```

Replace the existing `chat` method:
```ts
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
```

- [ ] **Step 2: Wire up the `claude-single` milestone**

In `scripts/ai-tool-calling-driver.ts`, replace the `claudeSingle` body:

```ts
async function claudeSingle() {
  const apiKey = requireEnv('ANTHROPIC_API_KEY')
  const svc = new ClaudeService({ apiKey })
  const tool = makeReadGraphTool()
  const result = await svc.chat({
    messages: [
      {
        role: 'system',
        content: 'You answer questions about a code graph using tools.',
      },
      { role: 'user', content: 'What is the label of node-1?' },
    ],
    tools: [tool],
  })
  console.log('content:', result.content)
  console.log('finishReason:', result.finishReason)
  console.log('toolCalls:', JSON.stringify(result.toolCalls, null, 2))
  if (!result.toolCalls || result.toolCalls.length === 0) {
    throw new Error('expected at least one tool call')
  }
  if (result.toolCalls[0].call.name !== 'read_graph_node') {
    throw new Error(`unexpected tool: ${result.toolCalls[0].call.name}`)
  }
  if (!result.content.toLowerCase().includes('main')) {
    throw new Error(
      `expected the answer to mention 'main' (node-1's label), got: ${result.content}`,
    )
  }
}
```

- [ ] **Step 3: Type-check and lint**

Run:
```bash
bunx tsc --noEmit && bun run lint
```
Expected: type errors persist only in `codex.service.ts` (the `stream` chunk shape). `claude.service.ts` and the driver should be clean.

If `claude.service.ts` has new errors, stop and reconcile against the Anthropic SDK's `MessageParam` / `ContentBlock` types before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/modules/ai/claude.service.ts scripts/ai-tool-calling-driver.ts
git commit -m "feat(ai): implement single-round tool calling for ClaudeService.chat"
```

- [ ] **Step 5: 🚦 Milestone: `claude-single`**

Tell the user:

> Please run: `ANTHROPIC_API_KEY=... bun run scripts/ai-tool-calling-driver.ts claude-single`
> Expected output: tool call to `read_graph_node` with `{id: "node-1"}`, then a final answer mentioning "main". Script prints `OK: claude-single`.

Do not proceed to Task 5 until the user confirms.

---

### Task 5: Claude `chat` — multi-round + executor error recovery

The loop already supports multi-round (Task 4's `for` iterates), but we haven't exercised it. This task adds milestone cases for chained calls and executor failure recovery.

**Files:**
- Modify: `scripts/ai-tool-calling-driver.ts`

- [ ] **Step 1: Add a graph-walking milestone**

Replace `claudeMulti` in the driver:

```ts
async function claudeMulti() {
  const apiKey = requireEnv('ANTHROPIC_API_KEY')
  const svc = new ClaudeService({ apiKey })
  const tool = makeReadGraphTool()
  const result = await svc.chat({
    messages: [
      {
        role: 'system',
        content:
          'You answer questions about a code graph using tools. Always look up each node you need by id before answering.',
      },
      {
        role: 'user',
        content:
          "Starting from node-1, what is the label of its FIRST neighbor's first neighbor? Walk the graph step by step using the tool.",
      },
    ],
    tools: [tool],
  })
  console.log('toolCalls:', JSON.stringify(result.toolCalls, null, 2))
  const calls = result.toolCalls ?? []
  if (calls.length < 3) {
    throw new Error(
      `expected >= 3 tool calls (node-1, node-2, node-4), got ${calls.length}`,
    )
  }
  if (!result.content.toLowerCase().includes('tokenize')) {
    throw new Error(`expected final answer to mention 'tokenize', got: ${result.content}`)
  }
}
```

- [ ] **Step 2: Add an executor-error milestone**

Replace `claudeError`:

```ts
async function claudeError() {
  const apiKey = requireEnv('ANTHROPIC_API_KEY')
  const svc = new ClaudeService({ apiKey })

  let calls = 0
  const flakyTool: AiToolDefinition<{ id: string }, { ok: true; id: string }> = {
    name: 'read_graph_node',
    description:
      'Read one graph node by id. Returns ok:true on success. Fails the first call.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
    execute: ({ id }) => {
      calls += 1
      if (calls === 1) throw new Error('transient network failure')
      return { ok: true, id }
    },
  }

  const result = await svc.chat({
    messages: [
      {
        role: 'system',
        content:
          'You answer questions about a code graph using tools. If a tool errors, retry it once before giving up.',
      },
      { role: 'user', content: 'Read node-1 and tell me you got it.' },
    ],
    tools: [flakyTool],
  })
  console.log('calls observed:', calls)
  console.log('toolCalls:', JSON.stringify(result.toolCalls, null, 2))
  const tc = result.toolCalls ?? []
  if (tc.length < 2) throw new Error('expected at least 2 calls (one failure, one retry)')
  if (!tc[0].result.isError) throw new Error('expected first call to be flagged as error')
  if (tc[tc.length - 1].result.isError) throw new Error('expected last call to succeed')
}
```

- [ ] **Step 2: Type-check and lint**

Run:
```bash
bunx tsc --noEmit && bun run lint
```
Expected: PASS for claude.service.ts and the driver. Codex errors remain.

- [ ] **Step 3: Commit**

```bash
git add scripts/ai-tool-calling-driver.ts
git commit -m "feat(ai): add milestones for Claude multi-round and executor error recovery"
```

- [ ] **Step 4: 🚦 Milestone: `claude-multi` and `claude-error`**

Tell the user:

> Please run: `ANTHROPIC_API_KEY=... bun run scripts/ai-tool-calling-driver.ts claude-multi`, then `claude-error`.
> `claude-multi`: expect 3+ tool calls and `tokenize` in the final answer. `claude-error`: expect calls[0].result.isError = true, last call success, final answer acknowledges the success.

Do not proceed to Task 6 until the user confirms both.

---

### Task 6: Claude `chat` — `maxToolRounds` cap

When the model is still asking for tools at round `maxToolRounds`, issue one more turn with `tool_choice: none` to force a final answer, and return `finishReason: 'max_tool_rounds'`.

**Files:**
- Modify: `src/modules/ai/claude.service.ts`
- Modify: `scripts/ai-tool-calling-driver.ts`

- [ ] **Step 1: Replace the loop's terminal branch**

In `src/modules/ai/claude.service.ts`, replace the existing `throw new Error('maxToolRounds exceeded — implemented in Task 6')` and the surrounding `for` loop's exit with a final forced turn. The new bottom of `chat` after the loop:

```ts
  // Cap reached — force a final natural-language answer.
  const finalMessage = await this.client.messages.create(
    {
      model: options.model ?? this.defaultModel,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.temperature,
      system,
      messages: working,
      tools: anthropicTools,
      tool_choice: { type: 'none' },
    },
    { signal: options.signal },
  )
  totalUsage = addUsage(totalUsage, mapUsage(finalMessage.usage))
  return {
    content: extractText(finalMessage.content),
    model: finalMessage.model,
    finishReason: 'max_tool_rounds',
    usage: totalUsage,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  }
}
```

Also change the loop condition from `round <= maxRounds` to `round < maxRounds` so that the cap branch is reached after exactly `maxRounds` tool-using turns.

- [ ] **Step 2: Add a cap milestone**

Replace `claudeCap` in the driver:

```ts
async function claudeCap() {
  const apiKey = requireEnv('ANTHROPIC_API_KEY')
  const svc = new ClaudeService({ apiKey })

  let calls = 0
  const everHungryTool: AiToolDefinition<{ n: number }, { next: number }> = {
    name: 'fetch_more',
    description:
      'Fetch one more record. Always returns { next: <input.n + 1> }. You MUST call this repeatedly to make progress.',
    inputSchema: {
      type: 'object',
      properties: { n: { type: 'number' } },
      required: ['n'],
      additionalProperties: false,
    },
    execute: ({ n }) => {
      calls += 1
      return { next: n + 1 }
    },
  }

  const result = await svc.chat({
    messages: [
      {
        role: 'system',
        content:
          'You collect numbers by calling fetch_more repeatedly with the previous output. Keep calling fetch_more until you have at least 50 numbers, then summarize.',
      },
      { role: 'user', content: 'Begin with n=0 and collect 50 numbers.' },
    ],
    tools: [everHungryTool],
    maxToolRounds: 3,
  })
  console.log('calls:', calls, 'finishReason:', result.finishReason)
  if (result.finishReason !== 'max_tool_rounds') {
    throw new Error(`expected max_tool_rounds, got ${result.finishReason}`)
  }
  if (!result.content || result.content.length === 0) {
    throw new Error('expected a forced natural-language answer')
  }
}
```

- [ ] **Step 3: Type-check and lint**

```bash
bunx tsc --noEmit && bun run lint
```
Expected: PASS for claude.service.ts and driver.

- [ ] **Step 4: Commit**

```bash
git add src/modules/ai/claude.service.ts scripts/ai-tool-calling-driver.ts
git commit -m "feat(ai): force final answer when maxToolRounds is hit (Claude)"
```

- [ ] **Step 5: 🚦 Milestone: `claude-cap`**

Tell the user:

> Please run: `ANTHROPIC_API_KEY=... bun run scripts/ai-tool-calling-driver.ts claude-cap`.
> Expected: `finishReason: 'max_tool_rounds'`, non-empty content. `calls` will be 3.

---

### Task 7: Claude `stream` — emit tagged-union chunks

Reshape `stream()` to emit text deltas plus `tool_call` / `tool_result` events between rounds.

**Files:**
- Modify: `src/modules/ai/claude.service.ts`
- Modify: `scripts/ai-tool-calling-driver.ts`

- [ ] **Step 1: Replace `stream()`**

Replace the existing `stream` method in `src/modules/ai/claude.service.ts`:

```ts
stream(options: AiChatOptions): AsyncIterable<AiStreamChunk> {
  const client = this.client
  const defaultModel = this.defaultModel
  const toolMap = new Map(options.tools?.map((t) => [t.name, t]) ?? [])
  const anthropicTools =
    options.tools && options.tools.length > 0
      ? toAnthropicTools(options.tools)
      : undefined
  const maxRounds = options.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS

  return {
    async *[Symbol.asyncIterator](): AsyncGenerator<AiStreamChunk> {
      const { system, rest } = splitSystem(options.messages)
      const working: MessageParam[] = rest.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      let totalUsage: AiUsage | undefined

      for (let round = 0; round < maxRounds; round++) {
        const roundStream = client.messages.stream(
          {
            model: options.model ?? defaultModel,
            max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
            temperature: options.temperature,
            system,
            messages: working,
            tools: anthropicTools,
          },
          { signal: options.signal },
        )
        try {
          for await (const event of roundStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              yield { type: 'text', delta: event.delta.text }
            }
          }
          const message = await roundStream.finalMessage()
          totalUsage = addUsage(totalUsage, mapUsage(message.usage))

          if (message.stop_reason !== 'tool_use') {
            yield {
              type: 'done',
              finishReason: mapFinishReason(message.stop_reason),
              usage: totalUsage,
            }
            return
          }

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
            yield { type: 'tool_call', call }
            const result = await runExecutor(
              toolMap.get(block.name),
              block,
              options.signal,
            )
            results.push(result)
            yield { type: 'tool_result', result }
          }
          working.push(toolResultsToUserMessage(results))
        } finally {
          roundStream.abort()
        }
      }

      // Cap reached — one more forced turn.
      const final = await client.messages.create(
        {
          model: options.model ?? defaultModel,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          temperature: options.temperature,
          system,
          messages: working,
          tools: anthropicTools,
          tool_choice: { type: 'none' },
        },
        { signal: options.signal },
      )
      totalUsage = addUsage(totalUsage, mapUsage(final.usage))
      const text = extractText(final.content)
      if (text) yield { type: 'text', delta: text }
      yield { type: 'done', finishReason: 'max_tool_rounds', usage: totalUsage }
    },
  }
}
```

- [ ] **Step 2: Add the `claude-stream` milestone**

Replace `claudeStream`:

```ts
async function claudeStream() {
  const apiKey = requireEnv('ANTHROPIC_API_KEY')
  const svc = new ClaudeService({ apiKey })
  const tool = makeReadGraphTool()
  const order: string[] = []
  let textPieces = 0
  for await (const chunk of svc.stream({
    messages: [
      {
        role: 'system',
        content: 'You answer questions about a code graph using tools.',
      },
      { role: 'user', content: 'What is the label of node-1?' },
    ],
    tools: [tool],
  })) {
    if (chunk.type === 'text') textPieces++
    else order.push(chunk.type)
  }
  console.log('order:', order, 'textPieces:', textPieces)
  if (order[0] !== 'tool_call') throw new Error("expected first non-text event = 'tool_call'")
  if (order[1] !== 'tool_result') throw new Error("expected 'tool_result' after 'tool_call'")
  if (order[order.length - 1] !== 'done') throw new Error("expected last event = 'done'")
  if (textPieces === 0) throw new Error('expected at least one text delta')
}
```

- [ ] **Step 3: Type-check and lint**

```bash
bunx tsc --noEmit && bun run lint
```
Expected: claude.service.ts and driver clean. Codex errors remain.

- [ ] **Step 4: Commit**

```bash
git add src/modules/ai/claude.service.ts scripts/ai-tool-calling-driver.ts
git commit -m "feat(ai): emit tagged-union stream chunks with tool calls (Claude)"
```

- [ ] **Step 5: 🚦 Milestone: `claude-stream`**

Tell the user:

> Please run: `ANTHROPIC_API_KEY=... bun run scripts/ai-tool-calling-driver.ts claude-stream`.
> Expected order of non-text events: `tool_call`, `tool_result`, `done`. Text deltas observed before and after the tool call.

---

### Task 8: Create the in-process MCP server (`codex-mcp.server.ts`)

This file is **provider-agnostic** — it accepts `AiToolDefinition[]` and exposes them on a Streamable-HTTP MCP server bound to `127.0.0.1:0`.

**Files:**
- Create: `src/modules/ai/codex-mcp.server.ts`

- [ ] **Step 1: Write the server module**

Create `src/modules/ai/codex-mcp.server.ts`:

```ts
import { createServer, type Server as HttpServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { AddressInfo } from 'node:net'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type {
  AiToolCall,
  AiToolDefinition,
  AiToolResult,
} from './ai.interface'

export interface GraphyMcpServer {
  /** Base URL the MCP client connects to (e.g. "http://127.0.0.1:54321/mcp"). */
  url: string
  /** Shut down the server and close all sessions. */
  close: () => Promise<void>
}

function stringifyResult(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * Start an MCP server that exposes `tools` as MCP tools. Each call invokes the
 * tool's `execute` function. `onCall` is invoked after each call with the
 * call/result pair, so the caller can record them on AiChatResult.toolCalls.
 *
 * Streamable HTTP transport. Binds 127.0.0.1:0 (kernel-assigned free port).
 */
export async function createGraphyMcpServer(
  tools: AiToolDefinition[],
  onCall?: (call: AiToolCall, result: AiToolResult) => void,
): Promise<GraphyMcpServer> {
  const server = new McpServer({
    name: 'graphy',
    version: '0.1.0',
  })

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema as never,
      },
      async (args: unknown) => {
        const callId = randomUUID()
        const call: AiToolCall = {
          id: callId,
          name: tool.name,
          args,
        }
        try {
          const value = await tool.execute(args as never, { signal: undefined })
          const result: AiToolResult = {
            id: callId,
            name: tool.name,
            content: stringifyResult(value),
            isError: false,
          }
          onCall?.(call, result)
          return {
            content: [{ type: 'text', text: result.content }],
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          const result: AiToolResult = {
            id: callId,
            name: tool.name,
            content: message,
            isError: true,
          }
          onCall?.(call, result)
          return {
            isError: true,
            content: [{ type: 'text', text: message }],
          }
        }
      },
    )
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  })
  await server.connect(transport)

  const httpServer: HttpServer = createServer((req, res) => {
    if (!req.url?.startsWith('/mcp')) {
      res.statusCode = 404
      res.end()
      return
    }
    transport.handleRequest(req, res).catch((err) => {
      console.error('[graphy mcp] request error:', err)
      if (!res.headersSent) res.statusCode = 500
      res.end()
    })
  })

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject)
    httpServer.listen({ host: '127.0.0.1', port: 0 }, () => resolve())
  })
  const addr = httpServer.address() as AddressInfo
  const url = `http://127.0.0.1:${addr.port}/mcp`

  return {
    url,
    close: async () => {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()))
      await server.close()
    },
  }
}
```

> Note for the implementer: the import paths above (`@modelcontextprotocol/sdk/server/mcp.js`, `.../streamableHttp.js`) match SDK v1.24's published `exports` map. If they don't resolve, run `node -e "console.log(Object.keys(require('@modelcontextprotocol/sdk/package.json').exports))"` and pick the matching subpath; do **not** silently substitute a different transport.

- [ ] **Step 2: Type-check and lint**

```bash
bunx tsc --noEmit && bun run lint
```
Expected: this file clean. Codex errors remain (we'll wire it up in Task 10).

- [ ] **Step 3: Commit**

```bash
git add src/modules/ai/codex-mcp.server.ts
git commit -m "feat(ai): add in-process MCP server bridging tool defs to Codex"
```

---

### Task 9: Verify Codex MCP-over-HTTP config syntax (Open Question #1)

Before wiring CodexService, **confirm** that the Codex CLI v0.130 accepts a Streamable-HTTP MCP server via `--config`. This is the open question the spec flagged.

**Files:** none modified in this task — it produces a finding the user confirms.

- [ ] **Step 1: Locate Codex CLI version and docs**

Run:
```bash
bun pm ls @openai/codex
bunx codex --version 2>/dev/null || node node_modules/@openai/codex/bin/codex.js --version
bunx codex --help 2>/dev/null | grep -i -E 'mcp|config' | head -20 || true
```
Record the version and any MCP-related help text.

- [ ] **Step 2: Inspect the SDK's flattened config shape**

```bash
grep -r --include='*.js' -n 'mcp_servers\|mcp-server\|streamable' node_modules/@openai/codex 2>/dev/null | head -30
grep -r --include='*.js' -n 'mcp_servers\|mcp-server\|streamable' node_modules/@openai/codex-sdk 2>/dev/null | head -30
```

- [ ] **Step 3: Empirically test config keys**

Start a throwaway HTTP MCP server. Quick driver:

```bash
bun run -e "
  import('./src/modules/ai/codex-mcp.server').then(async ({ createGraphyMcpServer }) => {
    const s = await createGraphyMcpServer([
      { name: 'ping', description: 'returns pong', inputSchema: { type: 'object', properties: {} }, execute: () => 'pong' },
    ])
    console.log(s.url)
  })
"
```

Then run:

```bash
echo "ping" | bunx codex exec --skip-git-repo-check --full-auto \
  --config "mcp_servers.graphy.url=http://127.0.0.1:PORT/mcp" 2>&1 | head -40
```

Replace `PORT` with the bound port. If Codex prints an error mentioning unrecognized config OR `mcp_servers.graphy` expects different keys, iterate on:
- `mcp_servers.graphy.transport=streamable_http` + `mcp_servers.graphy.url=...`
- `mcp_servers.graphy.type=streamable_http` + `mcp_servers.graphy.url=...`
- `mcp_servers.graphy.http.url=...`

- [ ] **Step 4: Also probe Open Question #2 (per-turn tool-call cap)**

```bash
bunx codex --help 2>/dev/null | grep -iE 'max[-_]tool|max[-_]calls|tool[-_]cap' | head
grep -ri --include='*.js' 'max_tool_calls\|max_tool_rounds\|tool_call_limit' node_modules/@openai/codex 2>/dev/null | head
```
If a key exists, record its name. If not, plan to leave `maxToolRounds` documented as "best-effort on Codex; relies on Codex's own safeguards and AbortSignal" in `CodexService` JSDoc.

- [ ] **Step 5: Record the finding**

Append a section to `docs/superpowers/specs/2026-05-18-ai-tool-calling-design.md` under "Open Questions" with the verified config shape (Q1) and the Q2 finding, OR if no HTTP key exists for Q1, write:

> **Open Question #1 resolution (YYYY-MM-DD):** Codex CLI v0.130 does not accept Streamable-HTTP MCP servers via `--config`. Plan falls back to stdio bridge: replace Task 8's HTTP server with a stdio server, and ship a stub binary that Codex spawns. **Stop here and notify the user — plan needs rework.**

- [ ] **Step 6: Commit the finding**

```bash
git add docs/superpowers/specs/2026-05-18-ai-tool-calling-design.md
git commit -m "docs(ai): resolve Codex MCP transport config (Open Questions #1, #2)"
```

- [ ] **Step 7: 🚦 Milestone: Open Questions #1 and #2 resolved**

Tell the user the verified config shape (e.g. `mcp_servers.graphy.url=http://...`) and the per-turn cap finding. Do not proceed to Task 10 until the user confirms.

---

### Task 10: CodexService — wire MCP server + parse tool calls (`chat`)

Use the config key resolved in Task 9. The example below assumes `mcp_servers.<name>.url=<url>` — adjust if Task 9 found something different.

**Files:**
- Modify: `src/modules/ai/codex.service.ts`
- Modify: `scripts/ai-tool-calling-driver.ts`

- [ ] **Step 1: Update CodexService `chat`**

Replace the contents of `src/modules/ai/codex.service.ts`'s imports and `chat` method:

```ts
import { Codex } from '@openai/codex-sdk'
import type {
  CodexOptions,
  McpToolCallItem,
  ThreadOptions,
  Usage,
} from '@openai/codex-sdk'
import type {
  AiChatOptions,
  AiChatResult,
  AiService,
  AiStreamChunk,
  AiStructuredOptions,
  AiStructuredResult,
  AiToolCall,
  AiToolResult,
  AiUsage,
} from './ai.interface'
import { flattenToPrompt } from './messages.util'
import {
  createGraphyMcpServer,
  type GraphyMcpServer,
} from './codex-mcp.server'

export interface CodexServiceOptions {
  apiKey: string
  defaultModel?: string
  baseUrl?: string
  /** When tools are passed to chat/stream, default approval policy. Default 'never'. */
  defaultApprovalPolicy?: ThreadOptions['approvalPolicy']
  /** When tools are passed to chat/stream, default sandbox mode. Default 'read-only'. */
  defaultSandboxMode?: ThreadOptions['sandboxMode']
}

const MCP_SERVER_NAME = 'graphy'

function mapUsage(usage: Usage | null): AiUsage | undefined {
  if (!usage) return undefined
  return {
    promptTokens: usage.input_tokens,
    completionTokens: usage.output_tokens,
    totalTokens: usage.input_tokens + usage.output_tokens,
  }
}

function callsFromMcpItem(item: McpToolCallItem): {
  call: AiToolCall
  result: AiToolResult
} | null {
  if (item.server !== MCP_SERVER_NAME) return null
  if (item.status !== 'completed' && item.status !== 'failed') return null
  const id = item.id
  const name = item.tool
  const args = item.arguments
  if (item.error) {
    return {
      call: { id, name, args },
      result: { id, name, content: item.error.message, isError: true },
    }
  }
  const text =
    item.result?.content
      ?.filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('') ?? ''
  return {
    call: { id, name, args },
    result: { id, name, content: text, isError: false },
  }
}

export class CodexService implements AiService {
  private readonly apiKey: string
  private readonly baseUrl: string | undefined
  private readonly defaultModel: string | undefined
  private readonly defaultApprovalPolicy: ThreadOptions['approvalPolicy']
  private readonly defaultSandboxMode: ThreadOptions['sandboxMode']

  constructor(options: CodexServiceOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl
    this.defaultModel = options.defaultModel
    this.defaultApprovalPolicy = options.defaultApprovalPolicy ?? 'never'
    this.defaultSandboxMode = options.defaultSandboxMode ?? 'read-only'
  }

  private buildThreadOptions(model: string | undefined, hasTools: boolean): ThreadOptions {
    const opts: ThreadOptions = {}
    if (model) opts.model = model
    if (hasTools) {
      opts.approvalPolicy = this.defaultApprovalPolicy
      opts.sandboxMode = this.defaultSandboxMode
    }
    return opts
  }

  async chat(options: AiChatOptions): Promise<AiChatResult> {
    const hasTools = !!options.tools && options.tools.length > 0
    let server: GraphyMcpServer | null = null
    const accumulated: Array<{ call: AiToolCall; result: AiToolResult }> = []

    try {
      const codexOptions: CodexOptions = {
        apiKey: this.apiKey,
        baseUrl: this.baseUrl,
      }
      if (hasTools) {
        server = await createGraphyMcpServer(options.tools!, (call, result) =>
          accumulated.push({ call, result }),
        )
        codexOptions.config = {
          mcp_servers: {
            [MCP_SERVER_NAME]: { url: server.url },
          },
        }
      }
      const codex = new Codex(codexOptions)
      const model = options.model ?? this.defaultModel
      const thread = codex.startThread(this.buildThreadOptions(model, hasTools))
      const turn = await thread.run(flattenToPrompt(options.messages), {
        signal: options.signal,
      })

      // Prefer the live accumulator; fall back to turn.items.
      let toolCalls = accumulated
      if (toolCalls.length === 0) {
        toolCalls = turn.items
          .filter(
            (i): i is McpToolCallItem => i.type === 'mcp_tool_call',
          )
          .map(callsFromMcpItem)
          .filter(
            (p): p is { call: AiToolCall; result: AiToolResult } => p !== null,
          )
      }

      return {
        content: turn.finalResponse,
        model: model ?? '',
        finishReason: 'stop',
        usage: mapUsage(turn.usage),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      }
    } finally {
      await server?.close()
    }
  }

  stream(_options: AiChatOptions): AsyncIterable<AiStreamChunk> {
    throw new Error('stream() not yet wired for tools — implemented in Task 11')
  }

  async generateObject<T>(
    options: AiStructuredOptions<T>,
  ): Promise<AiStructuredResult<T>> {
    if (options.tools && options.tools.length > 0) {
      throw new Error('tools and schema cannot be combined')
    }
    const codex = new Codex({ apiKey: this.apiKey, baseUrl: this.baseUrl })
    const model = options.model ?? this.defaultModel
    const thread = codex.startThread(model ? { model } : undefined)
    const turn = await thread.run(flattenToPrompt(options.messages), {
      outputSchema: options.schema,
      signal: options.signal,
    })
    const data = JSON.parse(turn.finalResponse) as T
    const raw: AiChatResult = {
      content: turn.finalResponse,
      model: model ?? '',
      finishReason: 'stop',
      usage: mapUsage(turn.usage),
    }
    return { data, raw }
  }
}
```

- [ ] **Step 2: Wire the `codex-single` milestone**

Replace `codexSingle` in the driver:

```ts
async function codexSingle() {
  const apiKey = requireEnv('OPENAI_API_KEY')
  const svc = new CodexService({ apiKey })
  const tool = makeReadGraphTool()
  const result = await svc.chat({
    messages: [
      {
        role: 'system',
        content:
          'You answer questions about a code graph. Use the read_graph_node tool to look up labels.',
      },
      { role: 'user', content: 'What is the label of node-1?' },
    ],
    tools: [tool],
  })
  console.log('content:', result.content)
  console.log('toolCalls:', JSON.stringify(result.toolCalls, null, 2))
  if (!result.toolCalls || result.toolCalls.length === 0) {
    throw new Error('expected at least one tool call from Codex')
  }
  if (!result.content.toLowerCase().includes('main')) {
    throw new Error(`expected 'main' in answer, got: ${result.content}`)
  }
}
```

- [ ] **Step 3: Type-check and lint**

```bash
bunx tsc --noEmit && bun run lint
```
Expected: all `src/modules/ai/*` files clean. Driver clean.

- [ ] **Step 4: Commit**

```bash
git add src/modules/ai/codex.service.ts scripts/ai-tool-calling-driver.ts
git commit -m "feat(ai): wire CodexService.chat to in-process MCP tool server"
```

- [ ] **Step 5: 🚦 Milestone: `codex-single`**

Tell the user:

> Please run: `OPENAI_API_KEY=... bun run scripts/ai-tool-calling-driver.ts codex-single`.
> Expected: at least one MCP tool call to `read_graph_node`, final answer mentions "main".

---

### Task 11: CodexService — `stream` with tool events

**Files:**
- Modify: `src/modules/ai/codex.service.ts`
- Modify: `scripts/ai-tool-calling-driver.ts`

- [ ] **Step 1: Replace `stream()`**

Replace the existing `stream()` stub in `src/modules/ai/codex.service.ts`:

```ts
stream(options: AiChatOptions): AsyncIterable<AiStreamChunk> {
  const hasTools = !!options.tools && options.tools.length > 0
  const apiKey = this.apiKey
  const baseUrl = this.baseUrl
  const defaultModel = this.defaultModel
  const threadOptionsBuilder = this.buildThreadOptions.bind(this)

  return {
    async *[Symbol.asyncIterator](): AsyncGenerator<AiStreamChunk> {
      let server: GraphyMcpServer | null = null
      try {
        const codexOptions: CodexOptions = { apiKey, baseUrl }
        if (hasTools) {
          server = await createGraphyMcpServer(options.tools!)
          codexOptions.config = {
            mcp_servers: { [MCP_SERVER_NAME]: { url: server.url } },
          }
        }
        const codex = new Codex(codexOptions)
        const model = options.model ?? defaultModel
        const thread = codex.startThread(
          threadOptionsBuilder(model, hasTools),
        )
        const { events } = await thread.runStreamed(
          flattenToPrompt(options.messages),
          { signal: options.signal },
        )

        for await (const event of events) {
          if (event.type === 'item.started' &&
              event.item.type === 'mcp_tool_call' &&
              event.item.server === MCP_SERVER_NAME) {
            const item = event.item
            yield {
              type: 'tool_call',
              call: { id: item.id, name: item.tool, args: item.arguments },
            }
            continue
          }
          if (event.type === 'item.completed') {
            if (event.item.type === 'agent_message') {
              yield { type: 'text', delta: event.item.text }
            } else if (
              event.item.type === 'mcp_tool_call' &&
              event.item.server === MCP_SERVER_NAME
            ) {
              const pair = callsFromMcpItem(event.item)
              if (pair) yield { type: 'tool_result', result: pair.result }
            }
            continue
          }
          if (event.type === 'turn.completed') {
            yield {
              type: 'done',
              finishReason: 'stop',
              usage: mapUsage(event.usage),
            }
            return
          }
        }
        // Stream ended without turn.completed (e.g. SDK error).
        yield { type: 'done', finishReason: 'stop' }
      } finally {
        await server?.close()
      }
    },
  }
}
```

- [ ] **Step 2: Wire the `codex-stream` milestone**

Replace `codexStream`:

```ts
async function codexStream() {
  const apiKey = requireEnv('OPENAI_API_KEY')
  const svc = new CodexService({ apiKey })
  const tool = makeReadGraphTool()
  const order: string[] = []
  let textPieces = 0
  for await (const chunk of svc.stream({
    messages: [
      {
        role: 'system',
        content: 'Use the read_graph_node tool.',
      },
      { role: 'user', content: 'Label of node-1?' },
    ],
    tools: [tool],
  })) {
    if (chunk.type === 'text') textPieces++
    else order.push(chunk.type)
  }
  console.log('order:', order, 'textPieces:', textPieces)
  if (!order.includes('tool_call')) throw new Error('no tool_call event seen')
  if (!order.includes('tool_result')) throw new Error('no tool_result event seen')
  if (order[order.length - 1] !== 'done') throw new Error("expected last event = 'done'")
  if (textPieces === 0) throw new Error('expected at least one text item')
}
```

- [ ] **Step 3: Type-check and lint**

```bash
bunx tsc --noEmit && bun run lint
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/ai/codex.service.ts scripts/ai-tool-calling-driver.ts
git commit -m "feat(ai): emit tool-call stream events from CodexService.stream"
```

- [ ] **Step 5: 🚦 Milestone: `codex-stream`**

Tell the user to run `codex-stream` and confirm `tool_call`, `tool_result`, and `done` events appear in the output along with text deltas.

---

### Task 12: Codex sandbox / approval milestone + `codex-sandbox`

Validate that when tools are present, Codex defaults to `approvalPolicy: 'never'` and `sandboxMode: 'read-only'` — so the agent doesn't reach for the built-in shell/file-edit tools.

**Files:**
- Modify: `scripts/ai-tool-calling-driver.ts`

- [ ] **Step 1: Add the `codex-sandbox` milestone**

Replace `codexSandbox`:

```ts
async function codexSandbox() {
  const apiKey = requireEnv('OPENAI_API_KEY')
  const svc = new CodexService({ apiKey })
  const tool = makeReadGraphTool()
  // Ask Codex to do something it would normally try to shell out for,
  // and verify it falls back to using our tool instead.
  const result = await svc.chat({
    messages: [
      {
        role: 'system',
        content:
          'You answer questions about a code graph. The only allowed tool is read_graph_node — do not attempt shell commands or file edits.',
      },
      {
        role: 'user',
        content: "List the labels of node-1 and its first neighbor's label.",
      },
    ],
    tools: [tool],
  })
  console.log('content:', result.content)
  // It should NOT contain CommandExecution evidence; instead it should describe labels.
  if (!result.content.toLowerCase().includes('parseinput') &&
      !result.content.toLowerCase().includes('main')) {
    throw new Error(`expected labels in answer, got: ${result.content}`)
  }
}
```

- [ ] **Step 2: Type-check and lint**

```bash
bunx tsc --noEmit && bun run lint
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/ai-tool-calling-driver.ts
git commit -m "test(ai): add codex sandbox/approval milestone driver"
```

- [ ] **Step 4: 🚦 Milestone: `codex-sandbox`**

Tell the user to run `codex-sandbox` and check the printed output. The final answer should mention `main` and/or `parseInput`. If the script prints `command_execution` items, the sandbox default isn't holding — investigate before merging.

---

### Task 13: Enforce `tools + schema` rejection on both providers

ClaudeService's `generateObject` doesn't currently check for tools either. Mirror the Codex check.

**Files:**
- Modify: `src/modules/ai/claude.service.ts`
- Modify: `scripts/ai-tool-calling-driver.ts`

- [ ] **Step 1: Add the check to ClaudeService.generateObject**

At the top of `generateObject` in `src/modules/ai/claude.service.ts`, before any provider call:

```ts
async generateObject<T>(
  options: AiStructuredOptions<T>,
): Promise<AiStructuredResult<T>> {
  if (options.tools && options.tools.length > 0) {
    throw new Error('tools and schema cannot be combined')
  }
  // ... existing implementation continues
```

- [ ] **Step 2: Wire `reject-tools-with-schema` milestone**

Replace the function in the driver:

```ts
async function rejectToolsWithSchema() {
  const tool = makeReadGraphTool()
  const checks: Array<[string, () => Promise<unknown>]> = [
    [
      'Claude',
      async () => {
        const apiKey = requireEnv('ANTHROPIC_API_KEY')
        const svc = new ClaudeService({ apiKey })
        return svc.generateObject({
          messages: [{ role: 'user', content: 'hi' }],
          schema: { type: 'object', properties: {} },
          tools: [tool],
        })
      },
    ],
    [
      'Codex',
      async () => {
        const apiKey = requireEnv('OPENAI_API_KEY')
        const svc = new CodexService({ apiKey })
        return svc.generateObject({
          messages: [{ role: 'user', content: 'hi' }],
          schema: { type: 'object', properties: {} },
          tools: [tool],
        })
      },
    ],
  ]
  for (const [name, fn] of checks) {
    let threw = false
    try {
      await fn()
    } catch (err) {
      threw = true
      if (!(err instanceof Error) || !err.message.includes('tools and schema cannot be combined')) {
        throw new Error(`${name}: wrong error: ${err}`)
      }
    }
    if (!threw) throw new Error(`${name}: expected throw`)
    console.log(`${name}: rejected as expected`)
  }
}
```

- [ ] **Step 3: Type-check and lint**

```bash
bunx tsc --noEmit && bun run lint
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/ai/claude.service.ts scripts/ai-tool-calling-driver.ts
git commit -m "feat(ai): reject tools+schema combination on ClaudeService"
```

- [ ] **Step 5: 🚦 Milestone: `reject-tools-with-schema`**

This milestone needs at least one env key (it short-circuits before any network call). Tell the user:

> Please run: `ANTHROPIC_API_KEY=dummy OPENAI_API_KEY=dummy bun run scripts/ai-tool-calling-driver.ts reject-tools-with-schema`.
> Expected: both providers throw `tools and schema cannot be combined`. Script prints `OK`.

---

### Task 14: Update barrel exports + final formatting

**Files:**
- Modify: `src/modules/ai/index.ts`

- [ ] **Step 1: Export the MCP server module**

Replace `src/modules/ai/index.ts`:

```ts
export * from './ai.interface'
export * from './messages.util'
export * from './claude.service'
export * from './codex.service'
export * from './codex-mcp.server'
```

- [ ] **Step 2: Run full formatting and lint**

```bash
bun run format && bun run check && bunx tsc --noEmit
```
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/ai/index.ts
git commit -m "feat(ai): expose GraphyMcpServer from module barrel"
```

---

### Task 15: Final verification + handoff

**Files:** none modified.

- [ ] **Step 1: Confirm git status is clean**

```bash
git status
```
Expected: `nothing to commit, working tree clean`.

- [ ] **Step 2: Confirm branch log**

```bash
git log --oneline main..HEAD
```
Expected: roughly 14 commits stacked on the spec, in the order of the tasks above.

- [ ] **Step 3: 🚦 Final milestone: `all`**

Tell the user:

> Please run: `ANTHROPIC_API_KEY=... OPENAI_API_KEY=... bun run scripts/ai-tool-calling-driver.ts all`.
> Expected: every milestone prints `OK`. Total runtime ~2–5 minutes depending on API latency.

Once the user confirms `all` passes, the feature is complete and ready for PR review against `main`.

---

## Notes for the executing agent

- **Never run the driver yourself.** It consumes API quota and may need keys the user hasn't given you. The user runs it at milestone gates.
- **Don't run dev/desktop commands** — per `CLAUDE.md`, the user starts those manually.
- **Stay on `feat/ai-tool-calling`.** Don't rebase or merge.
- **If `bunx tsc --noEmit` flags something outside `src/modules/ai/` or `scripts/ai-tool-calling-driver.ts`**, stop — that's existing code drift, not your concern.
- **If Task 9 finds the HTTP transport doesn't work**, stop and notify the user. Fallback (stdio bridge) is not in this plan.

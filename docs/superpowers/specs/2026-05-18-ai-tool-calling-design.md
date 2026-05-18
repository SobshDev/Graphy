# AI Tool Calling — Design

**Status:** approved (brainstorm)
**Date:** 2026-05-18
**Target branch:** `feat/ai-tool-calling`

## Goal

Add tool calling to `AiService` so callers can register JS functions that the model can invoke during a turn. The service runs the full tool-call loop internally and returns the assistant's final answer along with a record of the calls that happened.

The feature must work on **both providers** (Claude and Codex), through a single unified API.

## Non-goals

- MCP server interoperability for **caller-supplied** external MCP servers. (We host an MCP server internally as part of the Codex implementation, but the public API is "register a JS function," not "wire up an external MCP server.")
- Combining tools with `generateObject` structured output — explicit error.
- Streaming token deltas on Codex (Codex emits whole `agent_message` items today; this is preexisting behavior we preserve).
- Adding a test framework. The repo currently has none; manual verification only.

## Interface (`src/modules/ai/ai.interface.ts`)

### New types

```ts
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
```

Tool names must match `/^[a-zA-Z0-9_-]{1,64}$/` (Anthropic's constraint, also safe for MCP).
Executor return values that are not strings are JSON-stringified before being attached to `AiToolResult.content`.

### Modified types

```ts
export interface AiChatOptions {
  messages: AiMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  tools?: AiToolDefinition[]
  maxToolRounds?: number // default 25
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
```

`AiStreamChunk` is a **breaking change** to the existing `{ delta, done }` shape. Callers must be updated. The current codebase has no consumers of `stream()` outside the AI module itself, so the blast radius is limited.

### Unchanged

- `AiMessage` and `AiRole` are unchanged. Tool exchanges live inside the service-managed loop and never appear in the caller-supplied `messages` history.
- `generateObject` is unchanged. Passing both `tools` and `schema` throws synchronously: `tools and schema cannot be combined`.

## ClaudeService implementation (`src/modules/ai/claude.service.ts`)

The loop is implemented in our code on top of raw `client.messages.create` / `messages.stream`. We do not use the SDK's higher-level tool helpers — we need fine control over per-round stream events.

### `chat` loop

1. Convert `AiToolDefinition[]` → Anthropic `Tool[]` (`{ name, description, input_schema }`).
2. Maintain a working `messages` array seeded from the caller's input (after `splitSystem`).
3. Call `messages.create` with model, system, working messages, tools, temperature, max_tokens.
4. If `stop_reason !== 'tool_use'`: extract text, return `AiChatResult` with accumulated `toolCalls` and accumulated `usage`.
5. Otherwise:
   - Append the assistant message (the raw `content` array including `tool_use` blocks) to the working messages.
   - For each `tool_use` block: look up the matching executor by `name`. If unknown → synthesize an `AiToolResult { isError: true, content: 'unknown tool: <name>' }`. Otherwise run `execute(args, { signal })`; catch exceptions → `isError: true, content: <error.message>`.
   - Append a single `user` message whose content is an array of `tool_result` blocks (one per call), each `{ type: 'tool_result', tool_use_id, content, is_error }`.
   - Increment round counter. If `rounds === maxToolRounds`, go to step 6. Otherwise loop back to step 3.
6. **Cap reached:** issue one final `messages.create` with `tool_choice: { type: 'none' }` to force a natural-language answer. Return with `finishReason: 'max_tool_rounds'`.

Usage is summed across rounds (`promptTokens`, `completionTokens`, `totalTokens`).

### `stream` loop

Same structure as `chat`, but each round uses `client.messages.stream`. Per round:

- For each `content_block_delta` with `text_delta`, emit `{ type: 'text', delta }`.
- After `message_stop`, if `stop_reason !== 'tool_use'`: emit `{ type: 'done', finishReason, usage }` and finish.
- Otherwise, for each `tool_use` block in the just-finished message: emit `{ type: 'tool_call', call }`, run the executor, emit `{ type: 'tool_result', result }`. All these emissions happen with no provider call in flight. Then start round N+1.

If the AbortSignal fires mid-round, the in-flight stream is aborted and the iterator throws — same behavior as today's `stream()`.

### `generateObject`

Unchanged. If the caller somehow passes `tools` on a structured call (the type system prevents this directly, but runtime objects could), throw `tools and schema cannot be combined`.

## CodexService implementation (`src/modules/ai/codex.service.ts`)

Codex is agentic — it runs its own loop and discovers tools via MCP. We stand up an **in-process MCP server** per call and point Codex at it.

### New file: `src/modules/ai/codex-mcp.server.ts`

```ts
export interface GraphyMcpServer {
  url: string
  close: () => Promise<void>
}

export function createGraphyMcpServer(
  tools: AiToolDefinition[],
  onCall: (call: AiToolCall, result: AiToolResult) => void,
): Promise<GraphyMcpServer>
```

- Built on `@modelcontextprotocol/sdk` with the Streamable-HTTP transport.
- Binds to `127.0.0.1:0` (kernel picks a free port). Returns the bound URL.
- Registers one MCP tool per `AiToolDefinition`. The MCP tool handler:
  - Runs `execute(args, { signal: undefined })`. AbortSignal forwarding into MCP handlers is tracked as a follow-up (see Open Questions).
  - On success: returns the value as MCP `content` (text), JSON-stringified if non-string.
  - On exception: returns `isError: true` with the message.
  - In both cases, calls `onCall(call, result)` after the executor finishes so the service can record `AiChatResult.toolCalls`. Used only by the `chat` path; the `stream` path emits its own events from Codex's `item.started` / `item.completed` stream and does not depend on this callback.
- `close()` shuts down the listener and any open sessions.

### `chat` flow

1. If `options.tools?.length`:
   - `server = await createGraphyMcpServer(tools, onCall)` where `onCall` accumulates a local `toolCalls` array.
   - Build `config = { mcp_servers: { graphy: { url: server.url } } }` and pass it as `CodexOptions.config` on the `Codex` instance (or merge with existing options — see Implementation note below).
2. Else skip the MCP server entirely.
3. `thread = codex.startThread({ model, sandboxMode, approvalPolicy, ... })` with the configured defaults.
4. `turn = await thread.run(flattenToPrompt(messages), { signal })`.
5. Build `toolCalls` from the local `onCall` accumulator. If it's empty but `turn.items` contains `mcp_tool_call` items with `server === 'graphy'`, walk those as a defensive fallback (shouldn't normally happen — both sources should agree).
6. Return `AiChatResult` with `finishReason: 'stop'`, mapped usage, and `toolCalls`.
7. `finally { await server?.close() }`.

**Implementation note:** Codex SDK exposes `config` on the `Codex` constructor, not per-thread. We either (a) construct a fresh `Codex` instance per call when `tools` is passed (cheap — it's just config holding), or (b) merge the MCP config into a long-lived `Codex` and accept that one server URL serves all calls. Pick (a) — per-call lifecycle of the MCP server demands it anyway.

### `stream` flow

Same setup, but use `thread.runStreamed`. Map events:

- `item.completed` + `item.type === 'agent_message'` → emit `{ type: 'text', delta: item.text }`.
- `item.started` + `item.type === 'mcp_tool_call'` + `item.server === 'graphy'` → emit `{ type: 'tool_call', call }`.
- `item.completed` + `item.type === 'mcp_tool_call'` + `item.server === 'graphy'` → emit `{ type: 'tool_result', result }`.
- `turn.completed` → emit `{ type: 'done', usage }` and break.

`finally { await server?.close() }`.

### Codex sandbox / approval defaults

When `tools` are provided, default to:

- `approvalPolicy: 'never'`
- `sandboxMode: 'read-only'`

So Codex doesn't run shell/file-edit alongside our MCP tools without the caller asking for it. Both are overridable via `CodexServiceOptions` (add `defaultSandboxMode` and `defaultApprovalPolicy` fields). When `tools` is not provided, fall back to the SDK defaults — preserves today's behavior.

### `maxToolRounds` on Codex

Codex's tool loop is internal. The Codex CLI may or may not expose a "max tool calls per turn" config. If it does, pass it through; if not, document that `maxToolRounds` is **best-effort** on Codex and the caller should rely on `AbortSignal` + Codex's own limits. (See Open Questions.)

### `generateObject`

Unchanged. Same "tools + schema → throw" rule.

## Error handling summary

| Case                            | Behavior                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Executor throws                 | Caught; surfaced to model as `tool_result { isError: true, content: error.message }`. Loop continues.                                                   |
| Model calls an unknown tool     | Same as above with `content: 'unknown tool: <name>'`.                                                                                                   |
| `tools` + `schema` on same call | Throw `Error('tools and schema cannot be combined')` before any provider call.                                                                          |
| `maxToolRounds` hit (Claude)    | One final turn with `tool_choice: none`; `finishReason: 'max_tool_rounds'`.                                                                             |
| `maxToolRounds` hit (Codex)     | Best-effort — see Open Questions.                                                                                                                       |
| AbortSignal fires               | In-flight provider call aborted; in-flight executor receives `ctx.signal` (Claude only — see Open Questions for Codex); MCP server closed in `finally`. |
| MCP server port bind fails      | Throw immediately from `chat`/`stream` before invoking Codex.                                                                                           |

## Dependencies

- **Add:** `@modelcontextprotocol/sdk` (runtime). Codex SDK already uses `^1.24.0`, so we target the same major.

## Testing

The repo has no test runner (vitest was removed in commit `e09d6c9`). This branch will **not** add one. Verification is manual against a small driver script under `scripts/` that:

- Calls `chat` and `stream` on both providers with a single `read_graph_node(id)` style tool.
- Exercises a multi-round chain (model must read two nodes before answering).
- Forces an executor exception and verifies the model recovers.
- Confirms `AbortSignal` mid-flight cleans up the MCP server.
- Confirms `tools` + `schema` throws.

The driver script and manual checklist will be created as part of the implementation plan, not this design.

## Open Questions (resolve during implementation)

1. **Codex MCP-over-HTTP support.** Confirm the Codex CLI v0.130 config key for declaring a Streamable-HTTP MCP server (e.g. `mcp_servers.<name>.url` vs. `mcp_servers.<name>.transport.url` or similar). If only stdio is supported, replace `codex-mcp.server.ts` with `codex-mcp.bridge.ts` (a stdio stub binary that proxies to the in-process executors via Unix domain socket). The public `AiService` interface is unchanged either way.
2. **Codex per-turn tool-call cap.** Confirm whether the Codex CLI exposes a config key for capping internal MCP tool calls per turn. If yes, forward `maxToolRounds`. If no, document the limitation in the service's JSDoc.
3. **AbortSignal forwarding into MCP handlers.** The MCP SDK's tool handler signature may not accept an AbortSignal directly. Investigate whether we can plumb the caller's signal into running executors on the Codex path, or document that on Codex, executors only see `signal: undefined` and the only escape is the model returning.

## Branch & commit plan

- Branch: `feat/ai-tool-calling` off `main`.
- This spec is the first commit on the branch.
- Implementation plan (produced by the `writing-plans` skill) will land as the second commit.
- Implementation itself follows the plan.

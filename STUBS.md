# Tier 3 — Editing Tools: IPC Stubs

All four Tier 3 tools depend on Electron main-process IPC handlers that do
not exist yet. Each tool currently returns
`{ available: false, reason: 'IPC method ... not wired — see STUBS.md.' }`
when the corresponding method is missing from `window.graphyDesktop`.

The handlers must be added in `electron/main.cjs` (or a sibling module),
exposed via `electron/preload.cjs`, and typed in
`src/shared/lib/desktop.ts` (extending `GraphyDesktop`). None of those
files are in scope for this tier.

---

## 1. `graphy:fs:apply-edit`

Backs the `apply_edit` tool.

**Renderer call (preload-exposed method):**

```ts
applyEdit(payload: {
  file: string         // project-relative path
  oldString: string    // exact text to match
  newString: string    // replacement (may be empty)
  replaceAll: boolean  // when false, oldString must match exactly once
}): Promise<{
  applied: boolean
  file: string         // project-relative path of the file actually written
  replacements: number // number of substitutions made
}>
```

**Main-process responsibilities:**

- Resolve `file` against the currently-open project root. Reject any path
  that escapes the root (no `..`, no absolute paths).
- Read the file as UTF-8.
- If `replaceAll === false`, require `oldString` to occur **exactly once**.
  Otherwise reply with `{ applied: false, replacements: 0 }` (or throw —
  see Security below).
- If `replaceAll === true`, replace every occurrence.
- **Show a confirmation dialog** before writing (see Security).
- Write the file back atomically.

---

## 2. `graphy:edits:rename-symbol`

Backs the `rename_symbol` tool.

**Renderer call:**

```ts
renameSymbol(payload: {
  id: string       // "<relative-file>::<qualified-name>" — same shape as graph node ids
  newName: string  // new identifier (validate as a TS identifier)
}): Promise<{
  applied: boolean
  id: string             // original id (echoed)
  newId: string          // updated id reflecting newName
  affectedFiles: string[] // project-relative paths touched by the rename
}>
```

**Main-process responsibilities:**

- Re-open a `ts-morph` `Project` rooted at the active folder.
- Parse `id` into `<file>::<qualifiedName>`; locate the declaration via
  the same naming scheme that `src/modules/parser` uses to produce node
  ids (so the id space is shared with the graph).
- Validate `newName` is a syntactically valid TS identifier and does not
  collide in the target scope. Reject otherwise.
- Call `.rename(newName)` on the located node — `ts-morph` updates every
  reference.
- Save the project; collect the list of modified source-file paths.
- After saving, the main process **must** trigger a graph reparse (or
  emit the new graph through the existing `graph:set` channel that
  `useGraph()` subscribes to via `onGraph`). The AI can also call
  `reparse_project` explicitly, but renderer state should not silently
  drift.

---

## 3. `graphy:graph:reparse`

Backs the `reparse_project` tool.

**Renderer call:**

```ts
reparseProject(): Promise<{ ok: true }>
```

**Main-process responsibilities:**

- Re-run `parseProject(root)` against the currently-open folder.
- Emit the resulting graph through the existing `graph:set` channel —
  the renderer already subscribes via `getDesktop().onGraph(...)` inside
  `useGraph()`, so nothing else needs to wire up on the renderer side.
- Resolve once the parse completes and the broadcast has fired.

---

## 4. `graphy:shell:run`

Backs the `run_script` tool.

**Renderer call:**

```ts
runScript(payload: {
  script: 'lint' | 'check' | 'tidy' | 'test'
}): Promise<{
  exitCode: number
  stdout: string
  stderr: string
  truncated: boolean // true if output was clipped to a size cap
}>
```

**Main-process responsibilities:**

- Validate `script` against the whitelist **server-side** (see Security).
- Spawn `bun run <script>` with `cwd` set to the open project root.
- Capture stdout and stderr; cap each at a sensible byte limit (e.g.
  64 KB) and set `truncated: true` if either was clipped.
- Resolve with `exitCode` once the process exits. Do not throw on
  non-zero exit — surface the exit code to the caller.

---

## Security

These two boundaries MUST be enforced in the main process. The renderer
runs untrusted-ish code (the AI) and cannot be the source of truth.

### `apply_edit` confirmation dialog

The AI must never silently overwrite files. Before writing in
`graphy:fs:apply-edit`, the main process must:

1. Show a native confirmation dialog (e.g. `dialog.showMessageBox`) that
   includes the target file path, a diff or before/after preview, and
   the number of replacements about to be applied.
2. Proceed only if the user explicitly approves.
3. If the user cancels, resolve the IPC with
   `{ applied: false, file, replacements: 0 }` — do **not** throw, so the
   AI can detect the cancellation and report it cleanly.

### `run_script` strict whitelist

The renderer-side tool already restricts `script` to
`'lint' | 'check' | 'tidy' | 'test'` via `inputSchema.enum` and a
guard inside the handler, but **that is not sufficient**. The main
process must independently validate the value against the same
four-element whitelist and refuse any other input.

- Reject (throw or resolve with a clearly-marked error result) for any
  other value, including empty strings, falsy values, or anything coming
  from a malicious renderer payload.
- Do **not** accept arbitrary shell commands, additional CLI args, env
  overrides, or working-directory overrides. The script name is the
  entire surface area.
- Run with a fixed `cwd` (the active project root) and a fixed argv
  (`bun`, `run`, `<script>`). No string interpolation into a shell.

### `rename_symbol` and `reparse_project`

No interactive confirmation is required, but both write to the user's
project. The main process must:

- Resolve all paths under the active project root and reject anything
  escaping it.
- Bail out if no project is open.

---

# STUBS.md — Tier 4: Context Tools

These IPC contracts must be wired in the Electron main process before the tools become functional. Each tool currently returns `{ available: false, reason: '...' }` when the IPC method is absent.

---

## IPC Contracts

### `graphy:git:status`

- **Direction:** renderer → main
- **Input:** none
- **Output:** `{ branch: string | null, staged: string[], unstaged: string[], untracked: string[] }`
- **Notes:** Use `simple-git` (already a dependency) on the project root folder. Expose via `ipcMain.handle('graphy:git:status', ...)`.

### `graphy:git:diff`

- **Direction:** renderer → main
- **Input:** `{ file?: string, staged?: boolean, maxBytes?: number }`
- **Output:** `{ diff: string, truncated: boolean }`
- **Notes:** Run `git diff` (unstaged) or `git diff --cached` (staged). Slice output to `maxBytes`; set `truncated: true` if clipped.

### `graphy:git:blame`

- **Direction:** renderer → main
- **Input:** `{ file: string, line?: number, contextLines?: number }`
- **Output:** `{ lines: Array<{ line: number, sha: string, author: string, date: string, content: string }> }`
- **Notes:** Run `git blame --porcelain` and parse. If `line` is given, return only lines in `[line - contextLines, line + contextLines]`.

### `graphy:ui:focus-node`

- **Direction:** renderer → main → canvas
- **Input:** `{ id: string }`
- **Output:** `void` (no return value needed)
- **Notes:** The main process should forward this event to the renderer canvas component (e.g., via `webContents.send('graphy:ui:focus-node', { id })`). The canvas must listen and pan/highlight the matching node. Expose via `ipcMain.handle('graphy:ui:focus-node', ...)`. Wire `GraphyDesktop.focusNode` in `electron/preload.ts`.

### `graphy:ui:current-open-node`

- **Direction:** renderer → main (or renderer reads its own React state)
- **Input:** none
- **Output:** `{ open: true, id: string, file: string, line: number }` | `{ open: false }`
- **Notes:** The main process cannot know which node is selected — this IPC call should be bridged back into the renderer's selection state. An alternative is to expose a renderer-side synchronous getter (e.g., via a global) rather than routing through Electron IPC.

### `graphy:settings:get`

- **Direction:** renderer → main (or renderer reads localStorage directly)
- **Input:** `{ key?: "theme" | "defaultModel" | "providerKeys" }`
- **Output:** `{ settings: { theme?: string, defaultModel?: string, providerKeys?: Record<string, { hasKey: boolean }> } }`
- **Notes:** AI chat config currently lives in localStorage (`src/modules/ai-chat/lib/storage.ts`). To serve this from main, either proxy the localStorage read through the renderer or migrate the config to a main-process store. **SECURITY: raw API keys must never be included in the response.** Only return `{ hasKey: boolean }` per provider — enforce this in the main process handler, not just in the tool stub.

---

## API Key Safety Boundary

The `get_settings` tool enforces that `providerKeys` returns only `{ hasKey: boolean }` per provider. The main process handler **must** apply the same constraint — strip raw key values before sending the IPC response. This prevents accidental leakage of secrets into the AI context window or logs.

---

## ui/index.ts Coordination Note

`src/modules/ai/tools/ui/index.ts` is written by multiple tiers:

| Tier          | Tool                |
| ------------- | ------------------- |
| Tier 2        | `focus_node`        |
| Tier 4 (this) | `current_open_node` |
| Tier 5        | `toast`             |

The reviewer must reconcile this file at merge time. Each tier's `index.ts` exports only its own tool(s). The final merged file should export `createUiTools(): AiTool[]` returning all three tools. Do not merge partial versions without resolving conflicts across all three tiers first.

---

## Tier 5 Extras — Additional Stubs

### `graphy:ts:type-at` IPC contract

**Tool:** `type_at` (`src/modules/ai/tools/graph/type-at.tool.ts`)

**Direction:** renderer → main

**Input:**

```ts
{ file: string, line: number, column: number }
```

**Output:**

```ts
// Found:
{ found: true, file: string, line: number, column: number, name: string, type: string, kind: string }
// Not found:
{ found: false }
```

**Implementation notes:**

- The main process already has a `ts-morph` `Project` used by the parser.
- Use `project.getSourceFile(absolutePath)`, then convert line/col to a char offset, then `sourceFile.getDescendantAtPos(offset)`.
- Use `checker.getTypeAtLocation(node)` and `.typeToString()` for the type signature.
- Expose via `ipcMain.handle('graphy:ts:type-at', ...)`, bridge through the preload.
- Add `tsTypeAt(p: { file: string; line: number; column: number }): Promise<...>` to `GraphyDesktop` in `src/shared/lib/desktop.ts`.

---

### `graphy:web:fetch` IPC contract

**Tool:** `web_fetch` (`src/modules/ai/tools/web/web-fetch.tool.ts`)

**Direction:** renderer → main

**Input:**

```ts
{ url: string, maxBytes: number }
```

**Output:**

```ts
{ ok: true, contentType: string, body: string, truncated: boolean }
| { ok: false, reason: string }
```

**Host allow-list (validated in the main process — NEVER in the renderer):**

- `lucide.dev`
- `react.dev`
- `tanstack.com`
- `anthropic.com`
- `electronjs.org`
- `ts-morph.com`
- `bun.sh`
- `developer.mozilla.org`

**Validation logic (main process):**

```ts
const ALLOWED_HOSTS = new Set([
  'lucide.dev',
  'react.dev',
  'tanstack.com',
  'anthropic.com',
  'electronjs.org',
  'ts-morph.com',
  'bun.sh',
  'developer.mozilla.org',
])

function isAllowed(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url)
    if (protocol !== 'https:') return false
    return [...ALLOWED_HOSTS].some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    )
  } catch {
    return false
  }
}
```

- Use Node's built-in `fetch` (Electron / Node 18+), stream and accumulate up to `maxBytes`.
- Add `webFetch(p: { url: string; maxBytes: number }): Promise<...>` to `GraphyDesktop` in `src/shared/lib/desktop.ts`.

---

### Import extractor TODO

**File to create:** `src/modules/parser/importExtractor.ts`

Walk `ImportDeclaration` nodes in every source file and emit `{ source, target, type: 'imports' }` edges so that `imports_of` and `imported_by` return real data. Currently `graph.edges` has zero `type === 'imports'` entries, so both tools return `{ available: false }`.

**Outline:**

```ts
import { Project } from 'ts-morph'
import { relative } from 'path'
import type { GraphEdge, GraphNode } from './core/models'

export function extractImportEdges(
  project: Project,
  nodeIndex: Map<string, GraphNode>,
  root: string,
): GraphEdge[] {
  const edges: GraphEdge[] = []
  for (const sourceFile of project.getSourceFiles()) {
    const relSource = relative(root, sourceFile.getFilePath())
    for (const importDecl of sourceFile.getImportDeclarations()) {
      const targetFile = importDecl.getModuleSpecifierSourceFile()
      if (!targetFile) continue
      const relTarget = relative(root, targetFile.getFilePath())
      for (const namedImport of importDecl.getNamedImports()) {
        const targetId = `${relTarget}::${namedImport.getName()}`
        if (nodeIndex.has(targetId)) {
          // source id should be the enclosing function/class node id
          edges.push({
            source: `${relSource}::...`,
            target: targetId,
            type: 'imports',
          })
        }
      }
    }
  }
  return edges
}
```

Call after the existing node/edge pass and merge into `graph.edges` before IPC serialisation.

---

### `toast` implementation notes

`src/modules/ai/tools/ui/toast.tool.ts` imports `toast` from `sonner` directly (no IPC needed). `sonner ^2.0.7` is a declared dependency and the `<Toaster>` component is mounted in the renderer. If called outside a DOM context (test / Node worker), `sonner` silently no-ops — no IPC fallback is required.

---

## Tier 1 — Foundations: IPC Stubs

Tier 1 ships the foundational read-only AI tools. `read_node_source` uses an
existing IPC channel (`readFunctionSource`) and is fully wired. The three
`files/*` tools below depend on new IPC channels that the renderer expects on
`window.graphyDesktop` but which the main process does not yet implement.

Each stub is declared in the tool file via a local `DesktopExt` intersection
type. The handler returns `{ available: false, reason }` when the IPC method
is not present, so the renderer-side code is safe to ship before the main
process catches up.

### `graphy:fs:read-file`

**Tool:** `read_file` (`src/modules/ai/tools/files/read-file.tool.ts`).

**Method name on `window.graphyDesktop`:** `readProjectFile`.

**Direction:** renderer → main.

**Request payload:**

```ts
interface ReadFilePayload {
  path: string // project-relative file path
  startLine?: number // 1-based, inclusive
  endLine?: number // 1-based, inclusive
  maxBytes: number // hard cap on returned bytes (default 65536)
}
```

**Response shape:**

```ts
interface ReadFileResult {
  found: boolean
  path: string // echo of the requested path (project-relative)
  startLine: number // resolved start (1 if omitted)
  endLine: number // resolved end (last line of file if omitted)
  source: string // possibly truncated UTF-8 contents
  truncated: boolean // true if maxBytes clipped the response
}
```

**Main-process behavior:**

- Resolve `path` against the active project root from `getInitialState()`.
- Reject any resolved path that escapes the project root.
- Read the file as UTF-8.
- If `startLine`/`endLine` are provided, slice by 1-based inclusive line bounds.
- Cap the response at `maxBytes`; set `truncated = true` when the cap is hit.
- Return `{ found: false, … }` if the file does not exist (do not throw).

**Security boundary:** path-traversal check (`resolved.startsWith(projectRoot + sep)`) MUST happen in the main process. The renderer cannot be trusted to sanitize this. Channel is read-only.

---

### `graphy:fs:search`

**Tool:** `search_code` (`src/modules/ai/tools/files/search-code.tool.ts`).

**Method name on `window.graphyDesktop`:** `searchProject`.

**Direction:** renderer → main.

**Request payload:**

```ts
interface SearchCodePayload {
  query: string // literal or regex source (no flags)
  regex: boolean // if true, treat `query` as a regex
  filePattern?: string // optional glob restricting which files to search
  maxResults: number // cap on hits (default 50)
}
```

**Response shape:**

```ts
interface SearchHit {
  file: string // project-relative path
  line: number // 1-based
  match: string // the matched text
  preview: string // single-line preview around the match (<=200 chars)
}

interface SearchCodeResult {
  results: SearchHit[]
  truncated: boolean // true if maxResults clipped the response
}
```

**Main-process behavior — two paths, picked by capability:**

1. **Preferred — ripgrep (`rg`).** If `rg` is on `PATH`, spawn with:
   - `--json` for machine-readable output
   - `--max-count` per file and a global cap enforced after parsing
   - `--glob` from `filePattern` when provided
   - regex mode: pass `query` directly; literal mode: pass `--fixed-strings`
   - cwd = project root
   - parse `match` events into `SearchHit[]`; stop after `maxResults`.

2. **Fallback — node walker.** When `rg` is unavailable:
   - Use `fs.readdir(..., { withFileTypes: true })` to walk the tree.
   - Skip any directory in the shared IGNORED set (below).
   - Read each file line-by-line and test each line against the literal or regex needle.
   - Build `SearchHit` records until `maxResults` is reached.

In both cases, set `truncated = true` if the cap was the reason iteration stopped.

**Security boundary:**

- Validate `filePattern` does not contain `..` segments.
- Anchor all reads to the project root.
- Mitigate regex DoS by capping per-file evaluation time on the fallback path (ripgrep handles this on the preferred path).

---

### `graphy:fs:list-files`

**Tool:** `list_files` (`src/modules/ai/tools/files/list-files.tool.ts`).

**Method name on `window.graphyDesktop`:** `listProjectFiles`.

**Direction:** renderer → main.

**Request payload:**

```ts
interface ListFilesPayload {
  pattern?: string // optional glob applied to project-relative paths
  dir?: string // optional project-relative subdirectory
  maxResults: number // cap on returned paths (default 200)
}
```

**Response shape:**

```ts
interface ListFilesResult {
  files: string[] // project-relative paths
  truncated: boolean // true if maxResults clipped the response
}
```

**Main-process behavior:**

- Anchor the walk at `path.join(projectRoot, dir ?? '.')`.
- Reject `dir` that escapes the project root.
- Walk recursively. Skip any directory whose name is in the shared IGNORED set (below).
- If `pattern` is provided, filter project-relative paths through a glob matcher.
- Return up to `maxResults` paths, sorted lexicographically. Set `truncated = true` when more paths exist.

**Security boundary:** path-traversal check on the resolved scan root (must stay inside the project root). Channel is read-only.

---

### Shared IGNORED set (contract for `list_files` and `search_code` fallback)

The Tier 1 brief asks the main process to reuse `src/modules/files/services/file-tree.ts`'s IGNORED set, but that file does not exist on this branch. The same list lives in `electron/watcher.cjs` as `DEFAULT_IGNORES` and is unioned with the project's `.gitignore` by `buildIgnoreSet()`.

The renderer-side tool files do not import this set. The main process must apply, at minimum, this fixed contract:

```ts
const IGNORED = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-ssr',
  'dist-electron',
  'build',
  '.output',
  '.nitro',
  '.tanstack',
  '.vinxi',
  '.wrangler',
  'release',
  '.DS_Store',
])
```

…and union it with the project's `.gitignore`, identical to `electron/watcher.cjs#buildIgnoreSet`. Reusing that helper directly (it already lives in the main process) is fine; do not duplicate it in the renderer.

---

### Tier 1 open questions

- Should `read_file` accept absolute paths in addition to project-relative? The current contract is project-relative only.
- For `search_code`, when a single line contains multiple matches, the contract emits one `SearchHit` per matching line (the `match` field is the first occurrence). Confirm during wiring.

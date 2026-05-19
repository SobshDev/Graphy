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

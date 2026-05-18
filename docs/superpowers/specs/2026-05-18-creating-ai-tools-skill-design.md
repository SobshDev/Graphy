# Skill: `creating-ai-tools` — Design

## Purpose

A project-local Claude Code skill that teaches Claude how to author a new tool
for the Graphy AI service: a file under `src/modules/ai/tools/` that conforms
to the `AiTool` interface and is exposed to Claude during chat.

It is an **authoring** skill, not a runtime tool. It encodes the conventions
that already exist in `src/modules/ai/tools/graph/` so they survive across
sessions without us repeating them by hand.

## Location

```
.claude/skills/creating-ai-tools/SKILL.md
```

Checked into the repo so anyone working on Graphy with Claude Code picks it up.

## Frontmatter

```yaml
---
name: creating-ai-tools
description: Use when adding a new tool to the AI service (src/modules/ai/tools/) — for example, a new graph query, file lookup, or settings accessor that Claude should be able to call during chat. Encodes naming, layout, schema, and registration conventions.
---
```

## Body — section by section

### 1. Trigger conditions

```
Use this skill when you are about to create or modify a file under
`src/modules/ai/tools/` that defines an `AiTool` — something the AI service
exposes to Claude during chat.

Do NOT use this skill for:
- editing system prompts
- changing AiService providers (`claude.service.ts`, `codex.service.ts`)
- UI changes in `src/modules/ai-chat/`
- unrelated parsers/utilities elsewhere in the codebase

The contract is `AiTool` from `src/modules/ai/tools/tools.interface.ts`.
Every tool conforms to it. Nothing else.
```

### 2. Conventions

**File & symbol naming**

- File path: `src/modules/ai/tools/<category>/<kebab-verb>.tool.ts`
  (e.g. `find-callees.tool.ts`).
- Exported factory: `create<PascalName>Tool(<deps>): AiTool`.
- `name` field on the tool: `snake_case`, matching the file's verb
  (`find_callees`).
- Category folder owns an `index.ts` that exports a
  `create<Category>Tools(<shared deps>): AiTool[]` factory.

**Tool shape**

- `description`: one or two sentences. Lead with what the tool returns; add a
  "Use this to answer …" hint so the model picks the right tool.
- `inputSchema`: JSON Schema with `type: 'object'`, explicit `properties`,
  `required` for mandatory fields, and `additionalProperties: false`. Always.
- `handler`: signature `(input: unknown, ctx) => ...`. Cast `input` to a
  local `interface XxxInput`. Throw ``new Error('`field` is required.')`` for
  missing required fields — match the exact wording used in existing tools.
- Output: a plain JS object. Return only the fields the model needs; when
  the underlying record is large (e.g. a `GraphNode`), trim it through a
  local `slim()` helper in the tool file. See `find-callees.tool.ts` for the
  pattern.

**Dependency injection**

- Tools receive dependencies (e.g. `Graph`, `ClassInspector`) as factory
  arguments. They do not import singletons or read state at module load.
- Per-call setup that is expensive (e.g. building a `Map`) goes in the
  factory closure, not in the handler.

### 3. Worked example

Inline the full source of `src/modules/ai/tools/graph/get-node.tool.ts`
(40 lines) and annotate the meaningful lines: `name`, `description`,
`inputSchema`, the `interface GetNodeInput` cast, the `byId` map in the
factory closure, the `found: false` shape, and the `required` array.

### 4. Two-branch checklist

The skill ends with two short checklists — one per scenario.

**Branch A — new tool inside an existing category**

1. Create `src/modules/ai/tools/<category>/<kebab-verb>.tool.ts` following
   the conventions above.
2. Open `src/modules/ai/tools/<category>/index.ts` and add the
   `create...Tool(...)` call to the array returned by
   `create<Category>Tools(...)`.
3. Run verification (see Section 5).

**Branch B — new category**

1. Create the folder `src/modules/ai/tools/<category>/`.
2. Write the first tool file as in Branch A.
3. Create `src/modules/ai/tools/<category>/index.ts` exporting
   `create<Category>Tools(<deps>): AiTool[]`.
4. Re-export the category from `src/modules/ai/tools/index.ts`.
5. Open `src/modules/ai-chat/context/ai-chat-provider.tsx` and find where
   `createGraphTools(graphRef.current)` is invoked. Call the new factory
   alongside it and concatenate the results into the same `tools` array
   passed to the AI service.
6. Run verification (see Section 5).

### 5. Verification

```
After making changes, run:

  bun run tidy

Confirm:
- The file compiles (TypeScript ESLint via `bun run tidy`).
- The new tool's `name` is unique across all categories.
- The tool appears in the array returned by its category factory.
- For a new category: the factory is wired into ai-chat-provider.tsx.
```

This is the only verification step the skill prescribes — no test scaffolding
(the project does not currently test individual tool files).

## What the skill does NOT do

- Does not generate code via a script. Pure instruction.
- Does not introduce templates, `.tmpl` files, or generators.
- Does not cover changes to the `AiTool` interface itself, the provider
  services, or the chat UI.
- Does not cover adding documentation for tools — descriptions live on the
  tool itself.

## Open questions

None at design time. The conventions are mechanically derivable from the
five existing graph tools; the skill just makes them explicit.

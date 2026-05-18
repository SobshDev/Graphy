# `creating-ai-tools` Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a project-local Claude Code skill at `.claude/skills/creating-ai-tools/SKILL.md` that teaches Claude how to author new `AiTool` files for the Graphy AI service.

**Architecture:** A single markdown file. No code, no scripts, no templates. The skill encodes conventions already present in `src/modules/ai/tools/graph/` so future tool authoring is consistent across sessions.

**Tech Stack:** Plain markdown with YAML frontmatter. Verified via `bun run tidy` (Prettier covers `.md`). No tests — skills are configuration files, not code.

**Source spec:** `docs/superpowers/specs/2026-05-18-creating-ai-tools-skill-design.md`

**Note on testing:** This is a documentation deliverable. There is no automated test that fires the skill — verification is structural (frontmatter parses, sections present, matches the spec) and is performed in Task 2.

---

## File Structure

- Create: `.claude/skills/creating-ai-tools/SKILL.md` — the skill itself.

The `.claude/` directory does not yet exist in this repo and is not in `.gitignore`. We commit the skill so the team picks it up.

---

### Task 1: Write the skill file

**Files:**
- Create: `.claude/skills/creating-ai-tools/SKILL.md`

- [ ] **Step 1: Create the directory**

Run:
```bash
mkdir -p /Users/sobsh/dev/epitech/Graphy/.claude/skills/creating-ai-tools
```
Expected: no output, directory exists.

- [ ] **Step 2: Write `SKILL.md` with the exact content below**

Use the Write tool to create `.claude/skills/creating-ai-tools/SKILL.md` with this content, verbatim:

````markdown
---
name: creating-ai-tools
description: Use when adding a new tool to the AI service (src/modules/ai/tools/) — for example, a new graph query, file lookup, or settings accessor that Claude should be able to call during chat. Encodes naming, layout, schema, and registration conventions.
---

# Creating AI Tools

## When to use this skill

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

## Conventions

### File & symbol naming

- File path: `src/modules/ai/tools/<category>/<kebab-verb>.tool.ts`
  (e.g. `find-callees.tool.ts`).
- Exported factory: `create<PascalName>Tool(<deps>): AiTool`.
- `name` field on the tool: `snake_case`, matching the file's verb
  (`find_callees`).
- Category folder owns an `index.ts` that exports a
  `create<Category>Tools(<shared deps>): AiTool[]` factory.

### Tool shape

- `description`: one or two sentences. Lead with what the tool returns; add
  a "Use this to answer …" hint so the model picks the right tool.
- `inputSchema`: JSON Schema with `type: 'object'`, explicit `properties`,
  `required` for mandatory fields, and `additionalProperties: false`.
  Always.
- `handler`: signature `(input: unknown, ctx) => ...`. Cast `input` to a
  local `interface XxxInput`. Throw `` new Error('`field` is required.') ``
  for missing required fields — match the exact wording used in existing
  tools.
- Output: a plain JS object. Return only the fields the model needs; when
  the underlying record is large (e.g. a `GraphNode`), trim it through a
  local `slim()` helper in the tool file. See `find-callees.tool.ts` for
  the pattern.

### Dependency injection

- Tools receive dependencies (e.g. `Graph`, `ClassInspector`) as factory
  arguments. They do not import singletons or read state at module load.
- Per-call setup that is expensive (e.g. building a `Map`) goes in the
  factory closure, not in the handler.

## Worked example

Here is `src/modules/ai/tools/graph/get-node.tool.ts` in full. Mirror this
shape when adding a new tool:

```ts
import type { Graph } from '@/modules/parser'

import type { AiTool } from '../tools.interface'

interface GetNodeInput {
  id?: string
}

export function createGetNodeTool(graph: Graph): AiTool {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]))
  return {
    name: 'get_node',
    description:
      'Look up a single graph node by its id (e.g. "src/foo.ts::Bar.baz"). Returns the full node record including type, file, line, signature, body size, and in/out degree.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'Exact node id, formatted as "<relative-file>::<qualified-name>".',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
    handler: (input: unknown) => {
      const { id } = input as GetNodeInput
      if (!id) {
        throw new Error('`id` is required.')
      }
      const node = byId.get(id)
      if (!node) {
        return { found: false, id }
      }
      return { found: true, node }
    },
  }
}
```

Worth highlighting:

- `byId` is built once in the factory closure, not on every handler call.
- The `GetNodeInput` interface is local — there is no shared input-types
  file.
- The handler returns `{ found: false, id }` instead of throwing when the
  id is unknown; throw only for missing required inputs, not for
  "no result".
- `inputSchema` has `additionalProperties: false` and `required: ['id']`.

## Checklist

### Branch A — new tool inside an existing category

1. Create `src/modules/ai/tools/<category>/<kebab-verb>.tool.ts` following
   the conventions above.
2. Open `src/modules/ai/tools/<category>/index.ts` and add the
   `create...Tool(...)` call to the array returned by
   `create<Category>Tools(...)`.
3. Run verification (below).

### Branch B — new category

1. Create the folder `src/modules/ai/tools/<category>/`.
2. Write the first tool file as in Branch A.
3. Create `src/modules/ai/tools/<category>/index.ts` exporting
   `create<Category>Tools(<deps>): AiTool[]`.
4. Re-export the category from `src/modules/ai/tools/index.ts`.
5. Open `src/modules/ai-chat/context/ai-chat-provider.tsx` and find where
   `createGraphTools(graphRef.current)` is invoked. Call the new factory
   alongside it and concatenate the results into the same `tools` array
   passed to the AI service.
6. Run verification (below).

## Verification

After making changes, run:

```bash
bun run tidy
```

Confirm:

- The file compiles (TypeScript + ESLint via `bun run tidy`).
- The new tool's `name` is unique across all categories.
- The tool appears in the array returned by its category factory.
- For a new category: the factory is wired into `ai-chat-provider.tsx`.
````

- [ ] **Step 3: Sanity-check the file structurally**

Run:
```bash
ls -la /Users/sobsh/dev/epitech/Graphy/.claude/skills/creating-ai-tools/SKILL.md
head -5 /Users/sobsh/dev/epitech/Graphy/.claude/skills/creating-ai-tools/SKILL.md
```
Expected: file exists; the first five lines are exactly:
```
---
name: creating-ai-tools
description: Use when adding a new tool to the AI service (src/modules/ai/tools/) — for example, a new graph query, file lookup, or settings accessor that Claude should be able to call during chat. Encodes naming, layout, schema, and registration conventions.
---

```

- [ ] **Step 4: Confirm all five sections are present**

Run:
```bash
grep -E '^## ' /Users/sobsh/dev/epitech/Graphy/.claude/skills/creating-ai-tools/SKILL.md
```
Expected output, in this order:
```
## When to use this skill
## Conventions
## Worked example
## Checklist
## Verification
```

If any section is missing or out of order, re-run Step 2 with the correct content.

---

### Task 2: Format and commit

**Files:**
- Modify: `.claude/skills/creating-ai-tools/SKILL.md` (Prettier may rewrite spacing).

- [ ] **Step 1: Run the project formatter**

Run:
```bash
bun run tidy
```
Expected: exits 0. Prettier may reformat `SKILL.md`; ESLint should not touch it. If `bun run tidy` exits non-zero, read the error, fix the offending content in `SKILL.md`, and rerun until clean.

- [ ] **Step 2: Verify nothing outside the skill changed**

Run:
```bash
git status --short
```
Expected: the only changes are under `.claude/skills/creating-ai-tools/`. If other files appear in the diff, investigate — `bun run tidy` should not be touching unrelated files on this branch.

- [ ] **Step 3: Stage and commit**

Run:
```bash
git add .claude/skills/creating-ai-tools/SKILL.md
git commit -m "$(cat <<'EOF'
chore(claude): add creating-ai-tools skill

Encodes conventions for authoring new AiTool files under
src/modules/ai/tools/ so Claude Code follows the same pattern across
sessions. Spec: docs/superpowers/specs/2026-05-18-creating-ai-tools-skill-design.md
EOF
)"
```
Expected: a single new file committed.

- [ ] **Step 4: Verify the commit**

Run:
```bash
git show --stat HEAD
```
Expected: one file changed, `.claude/skills/creating-ai-tools/SKILL.md`, with roughly 130–160 insertions.

---

## Manual verification (for the user, after the plan completes)

The skill will only appear in Claude Code's skill list after a session restart. To confirm it loads, start a fresh Claude Code session in this repo and check that the skill list includes `creating-ai-tools`.

---

## Self-review notes

- **Spec coverage:** every section of the spec — frontmatter, trigger conditions, conventions, worked example, two-branch checklist, verification step — appears verbatim in the SKILL.md content embedded in Task 1, Step 2.
- **Placeholders:** none. The full SKILL.md content is inline; commit message is inline; expected outputs are inline.
- **Type consistency:** no types defined in this plan — it is documentation only.
- **Out of scope (intentionally):** writing an actual new AiTool to exercise the skill end-to-end. That would belong in a follow-up plan if the user wants a smoke test.

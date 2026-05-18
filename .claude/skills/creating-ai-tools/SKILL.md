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
  local `interface XxxInput`. Throw ``new Error('`field` is required.')``
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

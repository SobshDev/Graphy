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
import type { AiToolDefinition } from '../src/modules/ai/index'
import { ClaudeService } from '../src/modules/ai/index'

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
    arg === 'all' ? Object.entries(MILESTONES) : validateMilestone(arg)
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

function validateMilestone(
  arg: string,
): Array<[string, (typeof MILESTONES)[keyof typeof MILESTONES]]> {
  if (!(arg in MILESTONES)) {
    console.error(`Unknown milestone: ${arg}`)
    console.error(`Available: ${Object.keys(MILESTONES).join(', ')}, all`)
    process.exit(2)
  }
  const fn = MILESTONES[arg as keyof typeof MILESTONES]
  return [[arg, fn]]
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
    execute: ({ id }: { id: string }) => {
      const node = FIXTURE[id] as
        | { id: string; label: string; neighbors: string[] }
        | undefined
      if (!node) throw new Error(`unknown node id: ${id}`)
      return node
    },
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

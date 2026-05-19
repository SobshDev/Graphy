import { getDesktop } from '@/shared/lib/desktop'
import type { GraphyDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

const ALLOWED_SCRIPTS = ['lint', 'check', 'tidy', 'test'] as const
type AllowedScript = (typeof ALLOWED_SCRIPTS)[number]

interface RunScriptInput {
  script?: string
}

interface RunScriptPayload {
  script: AllowedScript
}

interface RunScriptResult {
  exitCode: number
  stdout: string
  stderr: string
  truncated: boolean
}

type DesktopExt = GraphyDesktop & {
  runScript: (payload: RunScriptPayload) => Promise<RunScriptResult>
}

function isAllowedScript(value: string): value is AllowedScript {
  return (ALLOWED_SCRIPTS as readonly string[]).includes(value)
}

export function createRunScriptTool(): AiTool {
  return {
    name: 'run_script',
    description:
      "Execute one of the project's whitelisted package scripts (`lint`, `check`, `tidy`, `test`). Returns exit code plus captured stdout/stderr. Use this to verify code health after edits; arbitrary commands are not supported.",
    inputSchema: {
      type: 'object',
      properties: {
        script: {
          type: 'string',
          enum: [...ALLOWED_SCRIPTS],
          description:
            'Whitelisted script name. Only "lint", "check", "tidy", or "test" are accepted.',
        },
      },
      required: ['script'],
      additionalProperties: false,
    },
    handler: async (input: unknown) => {
      const { script } = input as RunScriptInput
      if (!script) {
        throw new Error('`script` is required.')
      }
      if (!isAllowedScript(script)) {
        throw new Error(
          `\`script\` must be one of ${ALLOWED_SCRIPTS.join(', ')}.`,
        )
      }
      const ext = getDesktop() as DesktopExt | null
      if (!ext?.runScript) {
        return {
          available: false,
          reason: 'IPC method `graphy:shell:run` not wired — see STUBS.md.',
        }
      }
      return ext.runScript({ script })
    },
  }
}

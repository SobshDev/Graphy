import { getDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface RunCommandInput {
  command?: unknown
  args?: unknown
  timeoutMs?: unknown
}

export function createRunCommandTool(): AiTool {
  return {
    name: 'run_command',
    description:
      'Execute an arbitrary shell command in the project root and return its exit code plus captured stdout/stderr. The command runs without a shell, so pass the executable in `command` and each argument as a separate entry in `args` (no shell expansion, piping, or `&&`). Output is capped at 64 KiB per stream and the process is killed after `timeoutMs` (default 30s, max 10 min).',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description:
            'Executable to run, e.g. "bun", "git", "ls". Resolved via PATH; no shell interpretation.',
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Arguments passed to the command. Each token is a separate array entry, e.g. ["run", "lint"] or ["log", "--oneline", "-n", "20"].',
        },
        timeoutMs: {
          type: 'number',
          description:
            'Optional kill timeout in milliseconds. Defaults to 30000, capped at 600000.',
        },
      },
      required: ['command'],
      additionalProperties: false,
    },
    handler: async (input: unknown) => {
      const { command, args, timeoutMs } = (input ?? {}) as RunCommandInput
      if (typeof command !== 'string' || command.trim() === '') {
        throw new Error('`command` is required and must be a non-empty string.')
      }
      const argList = Array.isArray(args)
        ? args.filter((a): a is string => typeof a === 'string')
        : []
      const ext = getDesktop()
      if (!ext?.runCommand) {
        return {
          available: false,
          reason: 'IPC method `graphy:shell:run` not wired',
        }
      }
      return ext.runCommand({
        command,
        args: argList,
        timeoutMs: typeof timeoutMs === 'number' ? timeoutMs : undefined,
      })
    },
  }
}

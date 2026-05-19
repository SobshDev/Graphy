import { toast } from 'sonner'

import type { AiTool } from '../tools.interface'

interface ToastInput {
  message?: string
  kind?: 'info' | 'success' | 'error'
}

export function createToastTool(): AiTool {
  return {
    name: 'toast',
    description:
      'Display a toast notification in the UI. Use this to give the user a brief status update or confirmation after completing an action.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to display in the toast.',
        },
        kind: {
          type: 'string',
          enum: ['info', 'success', 'error'],
          description: 'Toast variant (default: "info").',
        },
      },
      required: ['message'],
      additionalProperties: false,
    },
    handler: (input: unknown) => {
      const { message, kind = 'info' } = input as ToastInput
      if (!message) throw new Error('`message` is required.')

      if (kind === 'success') {
        toast.success(message)
      } else if (kind === 'error') {
        toast.error(message)
      } else {
        toast.info(message)
      }

      return { ok: true }
    },
  }
}

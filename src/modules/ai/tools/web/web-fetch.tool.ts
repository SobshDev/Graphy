import { getDesktop } from '@/shared/lib/desktop'

import type { AiTool } from '../tools.interface'

interface WebFetchInput {
  url?: string
  maxBytes?: number
}

type WebFetchFn = (p: {
  url: string
  maxBytes: number
}) => Promise<
  | { ok: true; contentType: string; body: string; truncated: boolean }
  | { ok: false; reason: string }
>

export function createWebFetchTool(): AiTool {
  return {
    name: 'web_fetch',
    description:
      'Fetch the text content of a URL (documentation, specs, changelogs). Returns the raw body up to maxBytes. Security: only allow-listed hosts are accepted (validated in the main process). Use this to answer questions about external docs.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Fully-qualified URL to fetch (https only).',
        },
        maxBytes: {
          type: 'number',
          description: 'Maximum bytes to return (default: 65536).',
        },
      },
      required: ['url'],
      additionalProperties: false,
    },
    handler: async (input: unknown) => {
      const { url, maxBytes = 65536 } = input as WebFetchInput
      if (!url) throw new Error('`url` is required.')

      const desktop = getDesktop()
      const webFetch =
        desktop && 'webFetch' in desktop
          ? (desktop.webFetch as WebFetchFn | undefined)
          : undefined
      if (!webFetch) {
        return {
          available: false,
          reason: 'IPC method `graphy:web:fetch` not wired — see STUBS.md',
        }
      }

      return webFetch({ url, maxBytes })
    },
  }
}

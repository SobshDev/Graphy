import type { AiMessage } from './ai.interface'

export interface SplitMessages {
  system: string | undefined
  rest: AiMessage[]
}

export function splitSystem(messages: AiMessage[]): SplitMessages {
  const systemParts: string[] = []
  const rest: AiMessage[] = []
  for (const message of messages) {
    if (message.role === 'system') {
      systemParts.push(message.content)
    } else {
      rest.push(message)
    }
  }
  return {
    system: systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
    rest,
  }
}

export function flattenToPrompt(messages: AiMessage[]): string {
  const { system, rest } = splitSystem(messages)
  const parts: string[] = []
  if (system) parts.push(system)
  for (const message of rest) {
    const label = message.role === 'user' ? 'User' : 'Assistant'
    parts.push(`${label}: ${message.content}`)
  }
  return parts.join('\n\n')
}

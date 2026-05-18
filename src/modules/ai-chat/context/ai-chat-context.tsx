import { createContext } from 'react'

import type { AiProvider, ChatMessage } from '../types'

export interface AiChatContextValue {
  activeProvider: AiProvider | null
  keys: Partial<Record<AiProvider, string>>
  isOpen: boolean
  messages: ChatMessage[]
  isStreaming: boolean
  setActiveProvider: (provider: AiProvider) => void
  setKey: (provider: AiProvider, key: string) => void
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  sendMessage: (content: string) => void
  cancelStream: () => void
  clearMessages: () => void
}

export const AiChatContext = createContext<AiChatContextValue | null>(null)

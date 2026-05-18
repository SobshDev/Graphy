import { createContext } from 'react'

import type { AiProvider, ChatMessage, ChatModel, TokenUsage } from '../types'

export interface AiChatContextValue {
  activeModel: ChatModel
  activeProvider: AiProvider
  keys: Partial<Record<AiProvider, string>>
  isOpen: boolean
  messages: ChatMessage[]
  isStreaming: boolean
  tokenUsage: TokenUsage
  setActiveModel: (model: ChatModel) => void
  setKey: (provider: AiProvider, key: string) => void
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  sendMessage: (content: string) => void
  cancelStream: () => void
  clearMessages: () => void
}

export const AiChatContext = createContext<AiChatContextValue | null>(null)

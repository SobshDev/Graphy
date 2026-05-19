import { createContext } from 'react'

import type {
  AiProvider,
  ChatMessage,
  ChatModel,
  Conversation,
  TokenUsage,
} from '../types'

export interface AiChatContextValue {
  activeModel: ChatModel
  activeProvider: AiProvider
  keys: Partial<Record<AiProvider, string>>
  isOpen: boolean
  messages: ChatMessage[]
  isStreaming: boolean
  tokenUsage: TokenUsage
  conversations: Conversation[]
  activeConversation: Conversation | null
  setActiveModel: (model: ChatModel) => void
  setKey: (provider: AiProvider, key: string) => void
  removeKey: (provider: AiProvider) => void
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
  sendMessage: (content: string) => void
  cancelStream: () => void
  createConversation: () => void
  switchConversation: (id: string) => void
  deleteConversation: (id: string) => void
}

export const AiChatContext = createContext<AiChatContextValue | null>(null)

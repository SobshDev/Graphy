import { useContext } from 'react'

import { AiChatContext } from '../context/ai-chat-context'

export function useAiChat() {
  const ctx = useContext(AiChatContext)
  if (!ctx) {
    throw new Error('useAiChat must be used inside <AiChatProvider>')
  }
  return ctx
}

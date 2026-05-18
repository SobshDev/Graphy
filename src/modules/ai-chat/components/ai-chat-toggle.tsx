import { MessageCircle } from 'lucide-react'

import { Button } from '@/shared/ui/button'

import { useAiChat } from '../hooks/use-ai-chat'

export function AiChatToggle() {
  const { isOpen, toggleChat } = useAiChat()

  return (
    <Button
      size="sm"
      className="px-3"
      onClick={toggleChat}
      aria-pressed={isOpen}
    >
      <MessageCircle className="size-3.5" strokeWidth={1.9} />
      Chat
    </Button>
  )
}

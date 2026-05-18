import { BrainCircuit } from 'lucide-react'

import { Button } from '@/shared/ui/button'

import { useAiChat } from '../hooks/use-ai-chat'

export function AiChatToggle() {
  const { isOpen, toggleChat } = useAiChat()

  return (
    <Button
      variant={isOpen ? 'secondary' : 'ghost'}
      size="sm"
      onClick={toggleChat}
      aria-pressed={isOpen}
    >
      <BrainCircuit className="size-3.5" strokeWidth={1.7} />
      Chat
    </Button>
  )
}

import { BrainCircuit } from 'lucide-react'

import { Button } from '@/shared/ui/button'

import { useAiChat } from '../hooks/use-ai-chat'
import { AI_PROVIDER_LABELS } from '../types'

export function AiChatToggle() {
  const { activeProvider, isOpen, toggleChat } = useAiChat()
  const label = activeProvider ? AI_PROVIDER_LABELS[activeProvider] : 'AI'

  return (
    <Button
      variant={isOpen ? 'secondary' : 'ghost'}
      size="sm"
      onClick={toggleChat}
      aria-pressed={isOpen}
    >
      <BrainCircuit className="size-3.5" strokeWidth={1.7} />
      {label}
    </Button>
  )
}

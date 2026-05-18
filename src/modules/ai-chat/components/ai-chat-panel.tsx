import { Eraser, X } from 'lucide-react'

import { Button } from '@/shared/ui/button'

import { useAiChat } from '../hooks/use-ai-chat'
import { AiChatComposer } from './ai-chat-composer'
import { AiChatMessages } from './ai-chat-messages'
import { AiProviderMenu } from './ai-provider-menu'

export function AiChatPanel() {
  const { isOpen, closeChat, clearMessages, messages } = useAiChat()
  if (!isOpen) return null

  return (
    <aside className="bg-sidebar flex h-full w-[360px] shrink-0 flex-col border-l">
      <header className="border-sidebar-border flex h-12 items-center justify-between border-b pl-3 pr-2">
        <AiProviderMenu />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={clearMessages}
            disabled={messages.length === 0}
            aria-label="Clear chat"
            className="h-7 w-7"
          >
            <Eraser className="size-3.5" strokeWidth={1.7} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeChat}
            aria-label="Close chat"
            className="h-7 w-7"
          >
            <X className="size-3.5" strokeWidth={1.7} />
          </Button>
        </div>
      </header>

      <AiChatMessages />
      <AiChatComposer />
    </aside>
  )
}

import { Plus, X } from 'lucide-react'

import '../chat.css'

import { useAiChat } from '../hooks/use-ai-chat'
import { AiChatComposer } from './ai-chat-composer'
import { AiChatMessages } from './ai-chat-messages'
import { ClaudeLogo } from './claude-logo'

function formatTokens(n: number): string {
  if (n < 1000) return String(n)
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`
  return `${Math.round(n / 1000)}k`
}

const headerButtonClass =
  'inline-flex size-7 items-center justify-center rounded-md text-chat-text-2 transition-colors hover:bg-chat-hover hover:text-chat-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-chat-text-2'

export function AiChatPanel() {
  const { isOpen, closeChat, clearMessages, messages, tokenUsage } = useAiChat()
  if (!isOpen) return null

  const count = messages.length

  return (
    <aside className="graphy-chat bg-chat-bg text-chat-text font-chat-mono flex h-full w-[400px] shrink-0 flex-col border-l border-sidebar-border text-[14px] antialiased">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-3 py-2.5">
        <span className="inline-flex">
          <ClaudeLogo size={16} />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[12.5px]">
          <span className="truncate font-medium">chat</span>
          {count > 0 && (
            <span className="shrink-0 text-[11.5px] text-chat-text-3">
              · {count} {count === 1 ? 'msg' : 'msgs'}
            </span>
          )}
          {tokenUsage.total > 0 && (
            <span
              className="shrink-0 text-[11.5px] text-chat-text-3"
              title={`${tokenUsage.prompt} in · ${tokenUsage.completion} out`}
            >
              · {formatTokens(tokenUsage.total)} tok
            </span>
          )}
        </div>
        <button
          type="button"
          className={headerButtonClass}
          title="New chat"
          aria-label="New chat"
          onClick={clearMessages}
          disabled={messages.length === 0}
        >
          <Plus size={14} strokeWidth={1.7} />
        </button>
        <button
          type="button"
          className={headerButtonClass}
          title="Close chat"
          aria-label="Close chat"
          onClick={closeChat}
        >
          <X size={14} strokeWidth={1.7} />
        </button>
      </header>

      <AiChatMessages />
      <AiChatComposer />
    </aside>
  )
}

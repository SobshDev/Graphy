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

export function AiChatPanel() {
  const { isOpen, closeChat, clearMessages, messages, tokenUsage } = useAiChat()
  if (!isOpen) return null

  const count = messages.length

  return (
    <aside className="graphy-chat flex h-full w-[400px] shrink-0 flex-col border-l border-l-[rgba(255,255,255,0.07)]">
      <header className="chat-head">
        <span style={{ display: 'inline-flex' }}>
          <ClaudeLogo size={16} />
        </span>
        <div className="title">
          <span className="ttl">chat</span>
          {count > 0 && (
            <span className="meta">
              · {count} {count === 1 ? 'msg' : 'msgs'}
            </span>
          )}
          {tokenUsage.total > 0 && (
            <span
              className="meta"
              title={`${tokenUsage.prompt} in · ${tokenUsage.completion} out`}
            >
              · {formatTokens(tokenUsage.total)} tok
            </span>
          )}
        </div>
        <button
          type="button"
          className="ix"
          title="New chat"
          aria-label="New chat"
          onClick={clearMessages}
          disabled={messages.length === 0}
        >
          <Plus size={14} strokeWidth={1.7} />
        </button>
        <button
          type="button"
          className="ix"
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

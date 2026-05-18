import { Eraser, X } from 'lucide-react'

import '../chat.css'

import { useAiChat } from '../hooks/use-ai-chat'
import { AI_PROVIDER_LABELS } from '../types'
import { AiChatComposer } from './ai-chat-composer'
import { AiChatMessages } from './ai-chat-messages'
import { AiProviderMenu } from './ai-provider-menu'
import { ClaudeLogo } from './claude-logo'

export function AiChatPanel() {
  const { isOpen, closeChat, clearMessages, messages, activeProvider } =
    useAiChat()
  if (!isOpen) return null

  const providerLabel = activeProvider
    ? AI_PROVIDER_LABELS[activeProvider].toLowerCase()
    : 'no model'
  const count = messages.length

  return (
    <aside className="graphy-chat flex h-full w-[400px] shrink-0 flex-col border-l border-l-[rgba(255,255,255,0.07)]">
      <header className="chat-head">
        <span style={{ display: 'inline-flex' }}>
          <ClaudeLogo size={16} />
        </span>
        <div className="title">
          <span className="ttl">{providerLabel}</span>
          {count > 0 && (
            <span className="meta">
              · {count} {count === 1 ? 'msg' : 'msgs'}
            </span>
          )}
        </div>
        <AiProviderMenu />
        <button
          type="button"
          className="ix"
          title="Clear chat"
          aria-label="Clear chat"
          onClick={clearMessages}
          disabled={messages.length === 0}
        >
          <Eraser size={14} strokeWidth={1.7} />
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

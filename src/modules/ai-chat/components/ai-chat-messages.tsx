import { useEffect, useRef } from 'react'

import { cn } from '@/shared/lib/utils'

import { useAiChat } from '../hooks/use-ai-chat'
import { AI_PROVIDER_LABELS } from '../types'

export function AiChatMessages() {
  const { messages, activeProvider, isStreaming } = useAiChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, isStreaming])

  if (messages.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center px-6 text-center text-xs">
        {activeProvider ? (
          <p>
            Ask {AI_PROVIDER_LABELS[activeProvider]} anything. Messages are kept
            for this session only.
          </p>
        ) : (
          <p>Pick a model in the header to start chatting.</p>
        )}
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'rounded-md px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
            message.role === 'user'
              ? 'bg-muted text-foreground ml-6'
              : 'bg-sidebar text-foreground mr-6 border',
            message.error && 'text-destructive border-destructive/40',
          )}
        >
          {message.error ? (
            <span>{message.error}</span>
          ) : message.content.length > 0 ? (
            <span>{message.content}</span>
          ) : (
            <span className="text-muted-foreground">Thinking…</span>
          )}
        </div>
      ))}
    </div>
  )
}

import { useEffect, useRef } from 'react'

import { useAiChat } from '../hooks/use-ai-chat'
import type { ChatMessage } from '../types'
import { CHAT_MODEL_LABELS } from '../types'
import { ClaudeLogo } from './claude-logo'
import { Markdown } from './markdown'

export function AiChatMessages() {
  const { messages, activeModel, keys, activeProvider, isStreaming } =
    useAiChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, isStreaming])

  const hasKey = Boolean(keys[activeProvider])

  if (messages.length === 0) {
    return (
      <div className="empty">
        {hasKey ? (
          <>
            <h2>
              Ask <em>Claude</em> anything about your graph.
            </h2>
            <p>Messages live for this session only.</p>
          </>
        ) : (
          <>
            <h2>Add an API key to start.</h2>
            <p>Use the model picker below to set one up.</p>
          </>
        )}
      </div>
    )
  }

  const byline = `claude · ${CHAT_MODEL_LABELS[activeModel].toLowerCase()}`

  return (
    <div ref={scrollRef} className="chat-scroll">
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} byline={byline} />
      ))}
    </div>
  )
}

function MessageRow({
  message,
  byline,
}: {
  message: ChatMessage
  byline: string
}) {
  if (message.role === 'user') {
    return <div className="msg-user">{message.content}</div>
  }

  const showCaret = message.pending && !message.error
  const bodyClass = message.error
    ? 'msg-body is-error'
    : message.pending && message.content.length === 0
      ? 'msg-body is-thinking'
      : 'msg-body'

  return (
    <div className="msg">
      <div className="author">
        <span className="av">
          <ClaudeLogo size={14} />
        </span>
        <b>{byline}</b>
      </div>
      <div className={bodyClass}>
        {message.error ? (
          message.error
        ) : message.content.length === 0 && message.pending ? (
          <>
            Thinking
            <span className="caret" />
          </>
        ) : (
          <>
            <Markdown content={message.content} />
            {showCaret && <span className="caret" />}
          </>
        )}
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react'

import { cn } from '@/shared/lib/utils'

import { useAiChat } from '../hooks/use-ai-chat'
import type { ChatMessage } from '../types'
import { CHAT_MODEL_LABELS } from '../types'
import { ClaudeLogo } from './claude-logo'
import { Markdown } from './markdown'
import { ToolCallCard } from './tool-call-card'

const proseClass = cn(
  'font-chat-sans text-[13.5px] leading-[1.6] text-chat-text',
  'flex flex-col gap-2.5 [overflow-wrap:anywhere]',
  '[&>*]:m-0',
  '[&_h1]:font-chat-sans [&_h1]:text-[18px] [&_h1]:font-semibold [&_h1]:leading-[1.3] [&_h1]:tracking-[-0.01em] [&_h1]:text-chat-text',
  '[&_h2]:font-chat-sans [&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:leading-[1.3] [&_h2]:tracking-[-0.01em] [&_h2]:text-chat-text',
  '[&_h3]:font-chat-sans [&_h3]:text-[14.5px] [&_h3]:font-semibold [&_h3]:leading-[1.3] [&_h3]:tracking-[-0.01em] [&_h3]:text-chat-text',
  '[&_h4]:font-chat-sans [&_h4]:text-[13.5px] [&_h4]:font-semibold [&_h4]:uppercase [&_h4]:tracking-[0.08em] [&_h4]:text-chat-text-2',
  '[&_h5]:font-chat-sans [&_h5]:text-[13.5px] [&_h5]:font-semibold [&_h5]:uppercase [&_h5]:tracking-[0.08em] [&_h5]:text-chat-text-2',
  '[&_h6]:font-chat-sans [&_h6]:text-[13.5px] [&_h6]:font-semibold [&_h6]:uppercase [&_h6]:tracking-[0.08em] [&_h6]:text-chat-text-2',
  '[&_strong]:font-semibold [&_strong]:text-chat-text',
  '[&_em]:italic [&_em]:text-chat-text',
  '[&_a]:text-chat-accent [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-chat-accent-rail hover:[&_a]:decoration-chat-accent',
  '[&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1',
  '[&_ol]:pl-5 [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-1',
  '[&_li]:pl-0.5 [&_li::marker]:text-chat-text-3 [&_li>p]:m-0 [&_li>ul]:mt-1 [&_li>ol]:mt-1',
  '[&_blockquote]:m-0 [&_blockquote]:py-0.5 [&_blockquote]:pl-3 [&_blockquote]:border-l-2 [&_blockquote]:border-chat-accent-rail [&_blockquote]:text-chat-text-2',
  '[&_hr]:my-1 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-chat-line',
  '[&_table]:w-full [&_table]:border-collapse [&_table]:font-chat-sans [&_table]:text-[12.5px] [&_table]:border [&_table]:border-chat-line [&_table]:rounded-md [&_table]:overflow-hidden',
  '[&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:border-b [&_th]:border-r [&_th]:border-chat-line [&_th]:bg-chat-elev [&_th]:text-chat-text-2 [&_th]:font-semibold [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wider',
  '[&_td]:px-2.5 [&_td]:py-1.5 [&_td]:text-left [&_td]:border-b [&_td]:border-r [&_td]:border-chat-line',
  '[&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0',
  '[&_tr:last-child_td]:border-b-0',
)

const caretClass =
  'graphy-chat-caret inline-block w-[7px] h-[14px] bg-chat-accent align-[-2px] ml-0.5'

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
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto py-[22px] pl-4 pr-3">
        {hasKey ? (
          <>
            <h2 className="font-chat-sans m-0 text-[18px] font-medium leading-[1.3] tracking-[-0.01em] text-chat-text">
              Ask <em className="text-chat-accent not-italic">Claude</em>{' '}
              anything about your graph.
            </h2>
            <p className="font-chat-sans m-0 text-[12.5px] leading-[1.55] text-chat-text-3">
              Messages live for this session only.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-chat-sans m-0 text-[18px] font-medium leading-[1.3] tracking-[-0.01em] text-chat-text">
              Add an API key to start.
            </h2>
            <p className="font-chat-sans m-0 text-[12.5px] leading-[1.55] text-chat-text-3">
              Use the model picker below to set one up.
            </p>
          </>
        )}
      </div>
    )
  }

  const byline = `claude · ${CHAT_MODEL_LABELS[activeModel].toLowerCase()}`

  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto pb-3 pl-4 pr-3 pt-3.5"
    >
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
    return (
      <div className="font-chat-sans self-end max-w-[88%] rounded-[10px_10px_2px_10px] border border-chat-line bg-chat-bubble px-3 py-2.5 text-[13.5px] leading-[1.55] text-chat-text [white-space:pre-wrap] [overflow-wrap:anywhere]">
        {message.content}
      </div>
    )
  }

  const showCaret = message.pending && !message.error
  const isError = Boolean(message.error)
  const isThinking = message.pending && message.content.length === 0
  const toolCalls = message.toolCalls ?? []

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-chat-text-3">
        <span className="flex size-4 items-center justify-center">
          <ClaudeLogo size={14} />
        </span>
        <b className="font-semibold tracking-[0.14em] text-chat-text-2">
          {byline}
        </b>
      </div>
      {toolCalls.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {toolCalls.map((call) => (
            <ToolCallCard key={call.id} call={call} />
          ))}
        </div>
      )}
      <div
        className={cn(
          proseClass,
          isError && 'text-chat-danger [white-space:pre-wrap]',
          isThinking && 'text-chat-text-3',
        )}
      >
        {isError ? (
          message.error
        ) : isThinking ? (
          <>
            Thinking
            <span className={caretClass} />
          </>
        ) : (
          <>
            <Markdown content={message.content} />
            {showCaret && <span className={caretClass} />}
          </>
        )}
      </div>
    </div>
  )
}

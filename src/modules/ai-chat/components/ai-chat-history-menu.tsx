import { History, Search, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'

import { useAiChat } from '../hooks/use-ai-chat'
import type { Conversation } from '../types'

const TRIGGER_CLASS =
  'inline-flex size-7 items-center justify-center rounded-md text-chat-text-2 transition-colors hover:bg-chat-hover hover:text-chat-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-chat-text-2'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function relativeTime(timestamp: number, now: number): string {
  const diff = Math.max(0, now - timestamp)
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function firstUserPreview(conversation: Conversation): string {
  const firstUser = conversation.messages.find((m) => m.role === 'user')
  if (!firstUser) return ''
  return firstUser.content.slice(0, 60)
}

function displayTitle(conversation: Conversation): string {
  if (conversation.title) return conversation.title
  const preview = firstUserPreview(conversation)
  return preview.length > 0 ? preview : 'New chat'
}

export function AiChatHistoryMenu() {
  const {
    conversations,
    activeConversation,
    switchConversation,
    deleteConversation,
  } = useAiChat()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const sorted = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    const filtered =
      trimmed.length === 0
        ? conversations
        : conversations.filter((c) => {
            const haystack =
              `${c.title ?? ''} ${firstUserPreview(c)}`.toLowerCase()
            return haystack.includes(trimmed)
          })
    return [...filtered].sort((a, b) => b.updatedAt - a.updatedAt)
  }, [conversations, query])

  const now = Date.now()

  const handleSelect = (id: string) => {
    switchConversation(id)
    setOpen(false)
  }

  const handleDelete = (event: React.MouseEvent, id: string) => {
    event.stopPropagation()
    const target = conversations.find((c) => c.id === id)
    if (!target) return
    deleteConversation(id)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={TRIGGER_CLASS}
          title="Conversation history"
          aria-label="Conversation history"
        >
          <History size={14} strokeWidth={1.7} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          inputRef.current?.focus()
        }}
        className="font-chat-sans w-[340px] gap-0 overflow-hidden rounded-lg border border-chat-line-strong bg-chat-elev p-0 text-chat-text shadow-[0_8px_28px_rgba(0,0,0,0.45)] ring-0"
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Search
            size={13}
            strokeWidth={1.7}
            className="shrink-0 text-chat-text-4"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="font-chat-sans w-full bg-transparent text-[13px] leading-[1.4] text-chat-text outline-none placeholder:text-chat-text-4"
          />
        </div>
        <div className="max-h-[360px] overflow-y-auto border-t border-chat-line py-1">
          {sorted.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12.5px] text-chat-text-3">
              {query.trim().length > 0
                ? 'No matches.'
                : 'No conversations yet.'}
            </div>
          ) : (
            sorted.map((convo) => (
              <HistoryRow
                key={convo.id}
                conversation={convo}
                active={convo.id === activeConversation?.id}
                relativeAgo={relativeTime(convo.updatedAt, now)}
                onSelect={() => handleSelect(convo.id)}
                onDelete={(event) => handleDelete(event, convo.id)}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface HistoryRowProps {
  conversation: Conversation
  active: boolean
  relativeAgo: string
  onSelect: () => void
  onDelete: (event: React.MouseEvent) => void
}

function HistoryRow({
  conversation,
  active,
  relativeAgo,
  onSelect,
  onDelete,
}: HistoryRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      className={`group relative flex items-center gap-3 px-3 py-2 outline-none transition-colors hover:bg-chat-hover focus-visible:bg-chat-hover ${
        active ? 'bg-chat-hover' : ''
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-y-1.5 left-0 w-[2px] rounded-r bg-chat-accent-rail"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] leading-[1.3] text-chat-text">
          {displayTitle(conversation)}
        </span>
        <span className="truncate text-[11px] leading-[1.3] text-chat-text-4">
          {relativeAgo}
        </span>
      </div>
      <button
        type="button"
        aria-label="Delete conversation"
        title="Delete"
        onClick={onDelete}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded text-chat-text-4 opacity-0 transition-opacity hover:bg-chat-line hover:text-chat-text group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 size={12} strokeWidth={1.7} />
      </button>
    </div>
  )
}

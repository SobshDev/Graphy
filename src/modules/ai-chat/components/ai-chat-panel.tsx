import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

import { Plus, X } from 'lucide-react'

import '../chat.css'

import { useAiChat } from '../hooks/use-ai-chat'
import { AiChatComposer } from './ai-chat-composer'
import { AiChatMessages } from './ai-chat-messages'
import { ClaudeLogo } from './claude-logo'

const CHAT_PANEL_MIN_WIDTH = 320
const CHAT_PANEL_MAX_WIDTH = 640
const CHAT_PANEL_DEFAULT_WIDTH = 400
const CHAT_PANEL_RESIZE_STEP = 16

function formatTokens(n: number): string {
  if (n < 1000) return String(n)
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`
  return `${Math.round(n / 1000)}k`
}

function clampChatPanelWidth(width: number): number {
  return Math.min(CHAT_PANEL_MAX_WIDTH, Math.max(CHAT_PANEL_MIN_WIDTH, width))
}

const headerButtonClass =
  'inline-flex size-7 items-center justify-center rounded-md text-chat-text-2 transition-colors hover:bg-chat-hover hover:text-chat-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-chat-text-2'

export function AiChatPanel() {
  const { isOpen, closeChat, clearMessages, messages, tokenUsage } = useAiChat()
  const [panelWidth, setPanelWidth] = useState(CHAT_PANEL_DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const panelStyle = {
    width: panelWidth,
    minWidth: CHAT_PANEL_MIN_WIDTH,
    maxWidth: CHAT_PANEL_MAX_WIDTH,
  } satisfies CSSProperties

  const beginResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return

      event.preventDefault()
      resizeRef.current = {
        startX: event.clientX,
        startWidth: panelWidth,
      }
      setIsResizing(true)
    },
    [panelWidth],
  )

  const resizeWithKeyboard = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setPanelWidth((width) =>
          clampChatPanelWidth(width + CHAT_PANEL_RESIZE_STEP),
        )
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setPanelWidth((width) =>
          clampChatPanelWidth(width - CHAT_PANEL_RESIZE_STEP),
        )
      }
      if (event.key === 'Home') {
        event.preventDefault()
        setPanelWidth(CHAT_PANEL_MIN_WIDTH)
      }
      if (event.key === 'End') {
        event.preventDefault()
        setPanelWidth(CHAT_PANEL_MAX_WIDTH)
      }
    },
    [],
  )

  useEffect(() => {
    if (!isResizing) return

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect

    const handlePointerMove = (event: PointerEvent) => {
      const resize = resizeRef.current
      if (!resize) return

      setPanelWidth(
        clampChatPanelWidth(resize.startWidth + resize.startX - event.clientX),
      )
    }

    const stopResize = () => {
      resizeRef.current = null
      setIsResizing(false)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResize)
    }
  }, [isResizing])

  if (!isOpen) return null

  const count = messages.length

  return (
    <aside
      className="graphy-chat bg-chat-bg text-chat-text font-chat-mono relative flex h-full shrink-0 flex-col border-l border-sidebar-border text-[14px] antialiased"
      style={panelStyle}
    >
      <div
        role="separator"
        aria-label="Resize chat sidebar"
        aria-orientation="vertical"
        aria-valuemin={CHAT_PANEL_MIN_WIDTH}
        aria-valuemax={CHAT_PANEL_MAX_WIDTH}
        aria-valuenow={panelWidth}
        tabIndex={0}
        className="app-no-drag absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none outline-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-transparent before:transition-colors hover:before:bg-chat-line-strong focus-visible:before:bg-chat-accent"
        onPointerDown={beginResize}
        onKeyDown={resizeWithKeyboard}
      />
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

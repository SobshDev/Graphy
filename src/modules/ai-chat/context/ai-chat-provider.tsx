import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AiMessage } from '@/modules/ai'

import {
  AiServiceUnavailableError,
  createAiService,
} from '../lib/get-ai-service'
import { readAiConfig, writeAiConfig } from '../lib/storage'
import type { AiProvider, ChatMessage } from '../types'
import { AiChatContext  } from './ai-chat-context'
import type {AiChatContextValue} from './ai-chat-context';

interface AiChatProviderProps {
  children: React.ReactNode
}

function generateId(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID()
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function toAiMessages(messages: ChatMessage[]): AiMessage[] {
  return messages
    .filter((m) => !m.error)
    .map((m) => ({ role: m.role, content: m.content }))
}

export function AiChatProvider({ children }: AiChatProviderProps) {
  const [activeProvider, setActiveProviderState] = useState<AiProvider | null>(
    null,
  )
  const [keys, setKeys] = useState<Partial<Record<AiProvider, string>>>({})
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const stored = readAiConfig()
    setActiveProviderState(stored.activeProvider)
    setKeys(stored.keys)
  }, [])

  const persist = useCallback(
    (next: {
      activeProvider: AiProvider | null
      keys: Partial<Record<AiProvider, string>>
    }) => {
      writeAiConfig(next)
    },
    [],
  )

  const setActiveProvider = useCallback(
    (provider: AiProvider) => {
      setActiveProviderState(provider)
      persist({ activeProvider: provider, keys })
    },
    [keys, persist],
  )

  const setKey = useCallback(
    (provider: AiProvider, key: string) => {
      const nextKeys = { ...keys, [provider]: key }
      setKeys(nextKeys)
      persist({ activeProvider, keys: nextKeys })
    },
    [activeProvider, keys, persist],
  )

  const openChat = useCallback(() => setIsOpen(true), [])
  const closeChat = useCallback(() => setIsOpen(false), [])
  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), [])

  const cancelStream = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const clearMessages = useCallback(() => {
    cancelStream()
    setMessages([])
  }, [cancelStream])

  const sendMessage = useCallback(
    (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || isStreaming) return
      if (!activeProvider) return
      const apiKey = keys[activeProvider]
      if (!apiKey) return

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
      }
      const assistantId = generateId()
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        pending: true,
      }

      const baseHistory = [...messages, userMessage]
      setMessages([...baseHistory, assistantPlaceholder])
      setIsStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      void (async () => {
        try {
          const service = createAiService(activeProvider, apiKey)
          const stream = service.stream({
            messages: toAiMessages(baseHistory),
            signal: controller.signal,
          })

          let acc = ''
          for await (const chunk of stream) {
            if (chunk.delta) {
              acc += chunk.delta
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: acc } : m,
                ),
              )
            }
            if (chunk.done) break
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: acc, pending: false } : m,
            ),
          )
        } catch (err) {
          const aborted =
            err instanceof DOMException && err.name === 'AbortError'
          const message =
            err instanceof AiServiceUnavailableError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Unknown error'

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    pending: false,
                    error: aborted ? 'Cancelled.' : message,
                  }
                : m,
            ),
          )
        } finally {
          setIsStreaming(false)
          abortRef.current = null
        }
      })()
    },
    [activeProvider, isStreaming, keys, messages],
  )

  const value = useMemo<AiChatContextValue>(
    () => ({
      activeProvider,
      keys,
      isOpen,
      messages,
      isStreaming,
      setActiveProvider,
      setKey,
      openChat,
      closeChat,
      toggleChat,
      sendMessage,
      cancelStream,
      clearMessages,
    }),
    [
      activeProvider,
      keys,
      isOpen,
      messages,
      isStreaming,
      setActiveProvider,
      setKey,
      openChat,
      closeChat,
      toggleChat,
      sendMessage,
      cancelStream,
      clearMessages,
    ],
  )

  return (
    <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>
  )
}

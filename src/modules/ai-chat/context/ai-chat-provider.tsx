import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AiMessage } from '@/modules/ai'
import { createGraphTools } from '@/modules/ai'
import { useGraph } from '@/modules/graph'
import type { Graph } from '@/modules/parser'

import {
  AiServiceUnavailableError,
  createAiService,
} from '../lib/get-ai-service'
import { readAiConfig, writeAiConfig } from '../lib/storage'
import type { AiProvider, ChatMessage, ChatModel, TokenUsage } from '../types'
import {
  CHAT_MODEL_API_ID,
  CHAT_MODEL_PROVIDER,
  DEFAULT_CHAT_MODEL,
  EMPTY_TOKEN_USAGE,
} from '../types'
import { AiChatContext } from './ai-chat-context'
import type { AiChatContextValue } from './ai-chat-context'

const SYSTEM_PROMPT = [
  'You are an assistant embedded in Graphy, an IDE that renders TypeScript projects as a graph of functions, methods, arrow functions, and classes connected by "calls" edges.',
  "Always prefer the provided tools over guessing. They query the live parsed graph of the user's project:",
  '- `list_nodes` discovers what exists (optionally filtered by type / file / name).',
  '- `get_node` fetches a single node by its id ("<file>::<qualified-name>").',
  '- `inspect_class` returns a class with its methods, external dependencies, and aggregate counts.',
  '- `find_callers` and `find_callees` walk the call graph.',
  'When you reference code, cite real node ids, file paths, and line numbers from the tool results. If a tool returns nothing useful, say so plainly instead of inventing details.',
  'Do not use emojis in any response.',
].join('\n')

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
  const [activeModel, setActiveModelState] =
    useState<ChatModel>(DEFAULT_CHAT_MODEL)
  const [keys, setKeys] = useState<Partial<Record<AiProvider, string>>>({})
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>(EMPTY_TOKEN_USAGE)
  const abortRef = useRef<AbortController | null>(null)
  const { graph } = useGraph()
  const graphRef = useRef<Graph | null>(graph)
  useEffect(() => {
    graphRef.current = graph
  }, [graph])

  useEffect(() => {
    const stored = readAiConfig()
    setActiveModelState(stored.activeModel)
    setKeys(stored.keys)
  }, [])

  const persist = useCallback(
    (next: {
      activeModel: ChatModel
      keys: Partial<Record<AiProvider, string>>
    }) => {
      writeAiConfig(next)
    },
    [],
  )

  const setActiveModel = useCallback(
    (model: ChatModel) => {
      setActiveModelState(model)
      persist({ activeModel: model, keys })
    },
    [keys, persist],
  )

  const setKey = useCallback(
    (provider: AiProvider, key: string) => {
      const nextKeys = { ...keys, [provider]: key }
      setKeys(nextKeys)
      persist({ activeModel, keys: nextKeys })
    },
    [activeModel, keys, persist],
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
    setTokenUsage(EMPTY_TOKEN_USAGE)
  }, [cancelStream])

  const activeProvider = CHAT_MODEL_PROVIDER[activeModel]

  const sendMessage = useCallback(
    (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || isStreaming) return
      const provider = CHAT_MODEL_PROVIDER[activeModel]
      const apiKey = keys[provider]
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
          const service = createAiService(provider, apiKey)
          const tools = createGraphTools(graphRef.current)
          const aiMessages: AiMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...toAiMessages(baseHistory),
          ]
          const stream = service.stream({
            messages: aiMessages,
            model: CHAT_MODEL_API_ID[activeModel],
            signal: controller.signal,
            tools,
          })

          let acc = ''
          let finalToolCalls: ChatMessage['toolCalls']
          for await (const chunk of stream) {
            if (chunk.delta) {
              acc += chunk.delta
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: acc } : m,
                ),
              )
            }
            if (chunk.done) {
              const usage = chunk.result?.usage
              if (usage) {
                setTokenUsage((prev) => ({
                  prompt: prev.prompt + usage.promptTokens,
                  completion: prev.completion + usage.completionTokens,
                  total: prev.total + usage.totalTokens,
                }))
              }
              finalToolCalls = chunk.result?.toolCalls
              break
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: acc,
                    pending: false,
                    toolCalls: finalToolCalls,
                  }
                : m,
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
    [activeModel, isStreaming, keys, messages],
  )

  const value = useMemo<AiChatContextValue>(
    () => ({
      activeModel,
      activeProvider,
      keys,
      isOpen,
      messages,
      isStreaming,
      tokenUsage,
      setActiveModel,
      setKey,
      openChat,
      closeChat,
      toggleChat,
      sendMessage,
      cancelStream,
      clearMessages,
    }),
    [
      activeModel,
      activeProvider,
      keys,
      isOpen,
      messages,
      isStreaming,
      tokenUsage,
      setActiveModel,
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

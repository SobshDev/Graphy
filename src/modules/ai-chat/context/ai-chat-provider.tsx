import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AiMessage } from '@/modules/ai'
import {
  createEditsTools,
  createFilesTools,
  createGitTools,
  createGraphTools,
  createSettingsTools,
  createShellTools,
  createUiTools,
  createWebTools,
} from '@/modules/ai'
import { useGraph } from '@/modules/graph'
import type { Graph } from '@/modules/parser'

import {
  AiServiceUnavailableError,
  createAiService,
} from '../lib/get-ai-service'
import {
  readConversations,
  writeConversations,
} from '../lib/conversation-storage'
import { generateTitle } from '../lib/generate-title'
import { readAiConfig, writeAiConfig } from '../lib/storage'
import type { AiProvider, ChatMessage, ChatModel, Conversation } from '../types'
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
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function toAiMessages(messages: ChatMessage[]): AiMessage[] {
  return messages
    .filter((m) => !m.error)
    .map((m) => ({ role: m.role, content: m.content }))
}

function createEmptyConversation(model: ChatModel): Conversation {
  const now = Date.now()
  return {
    id: generateId(),
    title: null,
    createdAt: now,
    updatedAt: now,
    model,
    messages: [],
    tokenUsage: { ...EMPTY_TOKEN_USAGE },
  }
}

export function AiChatProvider({ children }: AiChatProviderProps) {
  const [defaultModel, setDefaultModelState] =
    useState<ChatModel>(DEFAULT_CHAT_MODEL)
  const [keys, setKeys] = useState<Partial<Record<AiProvider, string>>>({})
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>(() => [
    createEmptyConversation(DEFAULT_CHAT_MODEL),
  ])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const { graph } = useGraph()
  const graphRef = useRef<Graph | null>(graph)
  useEffect(() => {
    graphRef.current = graph
  }, [graph])

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const cfg = readAiConfig()
    setDefaultModelState(cfg.defaultModel)
    setKeys(cfg.keys)

    const stored = readConversations()
    if (stored.conversations.length > 0) {
      setConversations(stored.conversations)
      setActiveId(stored.activeId ?? stored.conversations[0].id)
    } else if (cfg.defaultModel !== DEFAULT_CHAT_MODEL) {
      // Align the bootstrap conversation's model with the persisted default.
      setConversations((prev) =>
        prev.map((c) =>
          c.messages.length === 0 ? { ...c, model: cfg.defaultModel } : c,
        ),
      )
    }
    setHydrated(true)
  }, [])

  // Ensure activeId always points to an existing conversation. Gated on
  // hydration so the initial mount doesn't race with `readConversations` and
  // overwrite the stored activeId with the bootstrap conversation's id.
  useEffect(() => {
    if (!hydrated) return
    if (conversations.length === 0) {
      const fresh = createEmptyConversation(defaultModel)
      setConversations([fresh])
      setActiveId(fresh.id)
      return
    }
    if (!activeId || !conversations.some((c) => c.id === activeId)) {
      const newest = [...conversations].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      )[0]
      setActiveId(newest.id)
    }
  }, [conversations, activeId, defaultModel, hydrated])

  // Persist conversations once hydration has happened.
  useEffect(() => {
    if (!hydrated) return
    writeConversations({ conversations, activeId })
  }, [conversations, activeId, hydrated])

  const persistConfig = useCallback(
    (next: {
      defaultModel: ChatModel
      keys: Partial<Record<AiProvider, string>>
    }) => {
      writeAiConfig(next)
    },
    [],
  )

  const patchConversation = useCallback(
    (id: string, patch: (c: Conversation) => Conversation) => {
      setConversations((prev) => prev.map((c) => (c.id === id ? patch(c) : c)))
    },
    [],
  )

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  )

  const activeModel = activeConversation?.model ?? defaultModel
  const messages = useMemo(
    () => activeConversation?.messages ?? [],
    [activeConversation],
  )
  const tokenUsage = activeConversation?.tokenUsage ?? EMPTY_TOKEN_USAGE
  const activeProvider = CHAT_MODEL_PROVIDER[activeModel]

  const setActiveModel = useCallback(
    (model: ChatModel) => {
      setDefaultModelState(model)
      persistConfig({ defaultModel: model, keys })
      if (activeId) {
        patchConversation(activeId, (c) => ({ ...c, model }))
      }
    },
    [activeId, keys, patchConversation, persistConfig],
  )

  const setKey = useCallback(
    (provider: AiProvider, key: string) => {
      const nextKeys = { ...keys, [provider]: key }
      setKeys(nextKeys)
      persistConfig({ defaultModel, keys: nextKeys })
    },
    [defaultModel, keys, persistConfig],
  )

  const openChat = useCallback(() => setIsOpen(true), [])
  const closeChat = useCallback(() => setIsOpen(false), [])
  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), [])

  const cancelStream = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const createConversation = useCallback(() => {
    setConversations((prev) => {
      const current = prev.find((c) => c.id === activeId)
      if (current && current.messages.length === 0) {
        // Reuse the existing empty conversation; just freshen its model.
        if (current.model !== defaultModel) {
          return prev.map((c) =>
            c.id === current.id
              ? { ...c, model: defaultModel, updatedAt: Date.now() }
              : c,
          )
        }
        return prev
      }
      const fresh = createEmptyConversation(defaultModel)
      setActiveId(fresh.id)
      return [fresh, ...prev]
    })
  }, [activeId, defaultModel])

  const switchConversation = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id)
        if (next.length === 0) {
          const fresh = createEmptyConversation(defaultModel)
          setActiveId(fresh.id)
          return [fresh]
        }
        if (id === activeId) {
          const newest = [...next].sort((a, b) => b.updatedAt - a.updatedAt)[0]
          setActiveId(newest.id)
        }
        return next
      })
    },
    [activeId, defaultModel],
  )

  const sendMessage = useCallback(
    (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || isStreaming) return
      const convoId = activeId
      if (!convoId) return
      const convo = conversations.find((c) => c.id === convoId)
      if (!convo) return
      const provider = CHAT_MODEL_PROVIDER[convo.model]
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

      const isFirstTurn = convo.messages.length === 0
      const baseHistory = [...convo.messages, userMessage]
      patchConversation(convoId, (c) => ({
        ...c,
        messages: [...baseHistory, assistantPlaceholder],
        updatedAt: Date.now(),
      }))
      setIsStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller
      const service = createAiService(provider, apiKey)
      const modelApiId = CHAT_MODEL_API_ID[convo.model]

      void (async () => {
        let firstAssistantText = ''
        let streamSucceeded = false
        try {
          const tools = [
            ...createGraphTools(graphRef.current),
            ...createEditsTools(),
            ...createFilesTools(),
            ...createGitTools(),
            ...createSettingsTools(),
            ...createShellTools(),
            ...createUiTools(),
            ...createWebTools(),
          ]
          const aiMessages: AiMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...toAiMessages(baseHistory),
          ]
          const stream = service.stream({
            messages: aiMessages,
            model: modelApiId,
            signal: controller.signal,
            tools,
          })

          let acc = ''
          let finalToolCalls: ChatMessage['toolCalls']
          for await (const chunk of stream) {
            if (chunk.delta) {
              acc += chunk.delta
              patchConversation(convoId, (c) => ({
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantId ? { ...m, content: acc } : m,
                ),
              }))
            }
            if (chunk.done) {
              const usage = chunk.result?.usage
              if (usage) {
                patchConversation(convoId, (c) => ({
                  ...c,
                  tokenUsage: {
                    prompt: c.tokenUsage.prompt + usage.promptTokens,
                    completion:
                      c.tokenUsage.completion + usage.completionTokens,
                    total: c.tokenUsage.total + usage.totalTokens,
                  },
                }))
              }
              finalToolCalls = chunk.result?.toolCalls
              break
            }
          }

          firstAssistantText = acc
          streamSucceeded = acc.length > 0
          patchConversation(convoId, (c) => ({
            ...c,
            updatedAt: Date.now(),
            messages: c.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: acc,
                    pending: false,
                    toolCalls: finalToolCalls,
                  }
                : m,
            ),
          }))
        } catch (err) {
          const aborted =
            err instanceof DOMException && err.name === 'AbortError'
          const message =
            err instanceof AiServiceUnavailableError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Unknown error'

          patchConversation(convoId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    pending: false,
                    error: aborted ? 'Cancelled.' : message,
                  }
                : m,
            ),
          }))
        } finally {
          setIsStreaming(false)
          abortRef.current = null
        }

        if (!streamSucceeded || !isFirstTurn) return
        try {
          const title = await generateTitle(
            service,
            modelApiId,
            userMessage.content,
            firstAssistantText,
            new AbortController().signal,
          )
          if (title.length > 0) {
            patchConversation(convoId, (c) =>
              c.title === null ? { ...c, title } : c,
            )
          }
        } catch {
          // Title generation is best-effort.
        }
      })()
    },
    [activeId, conversations, isStreaming, keys, patchConversation],
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
      conversations,
      activeConversation,
      setActiveModel,
      setKey,
      openChat,
      closeChat,
      toggleChat,
      sendMessage,
      cancelStream,
      createConversation,
      switchConversation,
      deleteConversation,
    }),
    [
      activeModel,
      activeProvider,
      keys,
      isOpen,
      messages,
      isStreaming,
      tokenUsage,
      conversations,
      activeConversation,
      setActiveModel,
      setKey,
      openChat,
      closeChat,
      toggleChat,
      sendMessage,
      cancelStream,
      createConversation,
      switchConversation,
      deleteConversation,
    ],
  )

  return (
    <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>
  )
}

import type { ChatMessage, ChatModel, Conversation, TokenUsage } from '../types'
import { CHAT_MODELS, EMPTY_TOKEN_USAGE } from '../types'

const STORAGE_KEY = 'graphy.chat-conversations'

export interface StoredConversations {
  conversations: Conversation[]
  activeId: string | null
}

export const EMPTY_CONVERSATIONS: StoredConversations = {
  conversations: [],
  activeId: null,
}

function isChatModel(value: unknown): value is ChatModel {
  return (
    typeof value === 'string' &&
    (CHAT_MODELS as ReadonlyArray<string>).includes(value)
  )
}

function parseTokenUsage(value: unknown): TokenUsage {
  if (!value || typeof value !== 'object') return EMPTY_TOKEN_USAGE
  const u = value as { prompt?: unknown; completion?: unknown; total?: unknown }
  return {
    prompt: typeof u.prompt === 'number' ? u.prompt : 0,
    completion: typeof u.completion === 'number' ? u.completion : 0,
    total: typeof u.total === 'number' ? u.total : 0,
  }
}

function parseMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== 'object') return null
  const m = value as {
    id?: unknown
    role?: unknown
    content?: unknown
    error?: unknown
    toolCalls?: unknown
    segments?: unknown
  }
  if (typeof m.id !== 'string') return null
  if (m.role !== 'user' && m.role !== 'assistant') return null
  if (typeof m.content !== 'string') return null
  const message: ChatMessage = { id: m.id, role: m.role, content: m.content }
  if (typeof m.error === 'string' && m.error.length > 0) message.error = m.error
  if (Array.isArray(m.toolCalls)) {
    message.toolCalls = m.toolCalls as ChatMessage['toolCalls']
  }
  if (Array.isArray(m.segments)) {
    message.segments = m.segments as ChatMessage['segments']
  }
  return message
}

function parseConversation(value: unknown): Conversation | null {
  if (!value || typeof value !== 'object') return null
  const c = value as {
    id?: unknown
    title?: unknown
    createdAt?: unknown
    updatedAt?: unknown
    model?: unknown
    messages?: unknown
    tokenUsage?: unknown
  }
  if (typeof c.id !== 'string') return null
  if (typeof c.createdAt !== 'number') return null
  if (typeof c.updatedAt !== 'number') return null
  if (!isChatModel(c.model)) return null
  if (!Array.isArray(c.messages)) return null

  const messages = c.messages
    .map(parseMessage)
    .filter((m): m is ChatMessage => m !== null)

  return {
    id: c.id,
    title: typeof c.title === 'string' && c.title.length > 0 ? c.title : null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    model: c.model,
    messages,
    tokenUsage: parseTokenUsage(c.tokenUsage),
  }
}

export function readConversations(): StoredConversations {
  if (typeof window === 'undefined') return EMPTY_CONVERSATIONS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_CONVERSATIONS
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return EMPTY_CONVERSATIONS

    const candidate = parsed as { conversations?: unknown; activeId?: unknown }
    const conversations = Array.isArray(candidate.conversations)
      ? candidate.conversations
          .map(parseConversation)
          .filter((c): c is Conversation => c !== null)
      : []

    const ids = new Set(conversations.map((c) => c.id))
    const activeId =
      typeof candidate.activeId === 'string' && ids.has(candidate.activeId)
        ? candidate.activeId
        : null

    return { conversations, activeId }
  } catch {
    return EMPTY_CONVERSATIONS
  }
}

function stripPending(message: ChatMessage): ChatMessage {
  if (!message.pending) return message
  const clone = { ...message }
  delete clone.pending
  return clone
}

export function writeConversations(state: StoredConversations): void {
  if (typeof window === 'undefined') return
  try {
    const serialisable: StoredConversations = {
      activeId: state.activeId,
      conversations: state.conversations.map((c) => ({
        ...c,
        messages: c.messages.map(stripPending),
      })),
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serialisable))
  } catch {
    // localStorage unavailable — silently no-op.
  }
}

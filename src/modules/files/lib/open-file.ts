import { useSyncExternalStore } from 'react'

import { setActiveView } from '@/shared/lib/active-view'
import { getDesktop } from '@/shared/lib/desktop'

export type TabFile = {
  path: string
  name: string
  content: string
  savedContent: string
}

type TabsState = {
  tabs: TabFile[]
  activeIndex: number
  pendingClosePath: string | null
}

let state: TabsState = { tabs: [], activeIndex: -1, pendingClosePath: null }
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return state
}

function getActiveFile(): TabFile | null {
  return state.tabs[state.activeIndex] ?? null
}

export function getOpenFile(): TabFile | null {
  return getActiveFile()
}

let activeRef: TabFile | null = null
function getActiveSnapshot() {
  const next = getActiveFile()
  if (
    activeRef &&
    next &&
    activeRef.path === next.path &&
    activeRef.content === next.content &&
    activeRef.savedContent === next.savedContent
  ) {
    return activeRef
  }
  activeRef = next
  return activeRef
}

let pendingRef: TabFile | null = null
function getPendingSnapshot() {
  if (!state.pendingClosePath) {
    pendingRef = null
    return null
  }
  const next = state.tabs.find((t) => t.path === state.pendingClosePath) ?? null
  if (pendingRef && next && pendingRef.path === next.path) {
    return pendingRef
  }
  pendingRef = next
  return pendingRef
}

function emit() {
  for (const listener of listeners) listener()
}

export function useOpenTabs() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useOpenFile() {
  return useSyncExternalStore(subscribe, getActiveSnapshot, getActiveSnapshot)
}

export function usePendingCloseTab() {
  return useSyncExternalStore(subscribe, getPendingSnapshot, getPendingSnapshot)
}

export async function openFile(filePath: string, name: string) {
  const existing = state.tabs.findIndex((t) => t.path === filePath)
  if (existing !== -1) {
    state = { ...state, activeIndex: existing }
    setActiveView('editor')
    emit()
    return
  }
  const desktop = getDesktop()
  if (!desktop) return
  const content = await desktop.readFile(filePath)
  const tab: TabFile = { path: filePath, name, content, savedContent: content }
  const tabs = [...state.tabs, tab]
  state = { tabs, activeIndex: tabs.length - 1, pendingClosePath: null }
  setActiveView('editor')
  emit()
}

export function setActiveTab(path: string) {
  const idx = state.tabs.findIndex((t) => t.path === path)
  if (idx === -1 || idx === state.activeIndex) return
  state = { ...state, activeIndex: idx }
  emit()
}

export function closeTab(path: string) {
  const idx = state.tabs.findIndex((t) => t.path === path)
  if (idx === -1) return
  const tabs = state.tabs.filter((_, i) => i !== idx)
  let activeIndex = state.activeIndex
  if (tabs.length === 0) {
    activeIndex = -1
  } else if (idx < activeIndex) {
    activeIndex -= 1
  } else if (idx === activeIndex) {
    activeIndex = Math.min(idx, tabs.length - 1)
  }
  const pendingClosePath =
    state.pendingClosePath === path ? null : state.pendingClosePath
  state = { tabs, activeIndex, pendingClosePath }
  emit()
}

export function closeActiveTab() {
  const active = getActiveFile()
  if (active) closeTab(active.path)
}

export function requestCloseTab(path: string) {
  const tab = state.tabs.find((t) => t.path === path)
  if (!tab) return
  if (tab.content === tab.savedContent) {
    closeTab(path)
    return
  }
  if (state.pendingClosePath === path) return
  state = { ...state, pendingClosePath: path }
  emit()
}

export function requestCloseActiveTab() {
  const active = getActiveFile()
  if (active) requestCloseTab(active.path)
}

export function cancelClose() {
  if (state.pendingClosePath === null) return
  state = { ...state, pendingClosePath: null }
  emit()
}

export function confirmCloseDiscard() {
  const path = state.pendingClosePath
  if (!path) return
  closeTab(path)
}

export async function confirmCloseSave() {
  const path = state.pendingClosePath
  if (!path) return
  await saveFile(path)
  closeTab(path)
}

export function updateFileContent(content: string) {
  const active = getActiveFile()
  if (!active) return
  const tabs = state.tabs.map((t) =>
    t.path === active.path ? { ...t, content } : t,
  )
  state = { ...state, tabs }
  emit()
}

export async function saveFile(path?: string) {
  const target = path
    ? (state.tabs.find((t) => t.path === path) ?? null)
    : getActiveFile()
  if (!target) return
  const desktop = getDesktop()
  if (!desktop) return
  await desktop.writeFile(target.path, target.content)
  const tabs = state.tabs.map((t) =>
    t.path === target.path ? { ...t, savedContent: t.content } : t,
  )
  state = { ...state, tabs }
  emit()
}

export function closeFile() {
  closeActiveTab()
}

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
}

let state: TabsState = { tabs: [], activeIndex: -1 }
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

function emit() {
  for (const listener of listeners) listener()
}

export function useOpenTabs() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useOpenFile() {
  return useSyncExternalStore(subscribe, getActiveSnapshot, getActiveSnapshot)
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
  state = { tabs, activeIndex: tabs.length - 1 }
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
  state = { tabs, activeIndex }
  emit()
}

export function closeActiveTab() {
  const active = getActiveFile()
  if (active) closeTab(active.path)
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

export async function saveFile() {
  const active = getActiveFile()
  if (!active) return
  const desktop = getDesktop()
  if (!desktop) return
  await desktop.writeFile(active.path, active.content)
  const tabs = state.tabs.map((t) =>
    t.path === active.path ? { ...t, savedContent: t.content } : t,
  )
  state = { ...state, tabs }
  emit()
}

export function closeFile() {
  closeActiveTab()
}

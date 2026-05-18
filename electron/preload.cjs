const { contextBridge, ipcRenderer } = require('electron')

function subscribe(channel, handler) {
  const listener = (_event, payload) => handler(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.off(channel, listener)
}

contextBridge.exposeInMainWorld('graphyDesktop', {
  platform: process.platform,
  getInitialState: () => ipcRenderer.invoke('graphy:get-initial-state'),
  openFolder: () => ipcRenderer.invoke('graphy:open-folder'),
  openRecent: (folder) => ipcRenderer.invoke('graphy:open-recent', folder),
  closeFolder: () => ipcRenderer.invoke('graphy:close-folder'),
  reloadGraph: () => ipcRenderer.invoke('graphy:reload'),
  clearRecents: () => ipcRenderer.invoke('graphy:clear-recents'),
  onProject: (handler) => subscribe('project:set', handler),
  onGraph: (handler) => subscribe('graph:set', handler),
  readFunctionSource: (payload) => ipcRenderer.invoke('function:read', payload),
  writeFunctionSource: (payload) =>
    ipcRenderer.invoke('function:write', payload),
})

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.dataset.electron = process.platform
})

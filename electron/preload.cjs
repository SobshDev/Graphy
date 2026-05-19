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
  cacheLayout: (layout) => ipcRenderer.invoke('graphy:cache-layout', layout),
  onProject: (handler) => subscribe('project:set', handler),
  onGraph: (handler) => subscribe('graph:set', handler),
  readFunctionSource: (payload) => ipcRenderer.invoke('function:read', payload),
  writeFunctionSource: (payload) =>
    ipcRenderer.invoke('function:write', payload),
  getFileTree: () => ipcRenderer.invoke('graphy:file-tree'),
  createFile: (filePath) => ipcRenderer.invoke('graphy:create-file', filePath),
  createDir: (dirPath) => ipcRenderer.invoke('graphy:create-dir', dirPath),
  moveFile: (sourcePath, destDir) =>
    ipcRenderer.invoke('graphy:move-file', { sourcePath, destDir }),
  deleteFile: (filePath) => ipcRenderer.invoke('graphy:delete-file', filePath),
  renameFile: (oldPath, newName) =>
    ipcRenderer.invoke('graphy:rename-file', { oldPath, newName }),
  searchText: (query) => ipcRenderer.invoke('graphy:search-text', query),
  readFile: (filePath) => ipcRenderer.invoke('graphy:read-file', filePath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke('graphy:write-file', { file: filePath, content }),
  readProjectFile: (payload) =>
    ipcRenderer.invoke('graphy:fs:read-file', payload),
  searchProject: (payload) => ipcRenderer.invoke('graphy:fs:search', payload),
  listProjectFiles: (payload) =>
    ipcRenderer.invoke('graphy:fs:list-files', payload),
  applyEdit: (payload) => ipcRenderer.invoke('graphy:fs:apply-edit', payload),
  renameSymbol: (payload) =>
    ipcRenderer.invoke('graphy:edits:rename-symbol', payload),
  reparseProject: () => ipcRenderer.invoke('graphy:graph:reparse'),
  runScript: (payload) => ipcRenderer.invoke('graphy:shell:run', payload),
  gitStatus: () => ipcRenderer.invoke('graphy:git:status'),
  gitDiff: (payload) => ipcRenderer.invoke('graphy:git:diff', payload),
  gitBlame: (payload) => ipcRenderer.invoke('graphy:git:blame', payload),
  focusNode: (payload) => ipcRenderer.invoke('graphy:ui:focus-node', payload),
  tsTypeAt: (payload) => ipcRenderer.invoke('graphy:ts:type-at', payload),
  webFetch: (payload) => ipcRenderer.invoke('graphy:web:fetch', payload),
  onFocusNode: (handler) => subscribe('graphy:ui:focus-node', handler),
})

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.dataset.electron = process.platform
})

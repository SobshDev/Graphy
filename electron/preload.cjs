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
  getFileTree: () => ipcRenderer.invoke('graphy:file-tree'),
  createFile: (filePath) => ipcRenderer.invoke('graphy:create-file', filePath),
  createDir: (dirPath) => ipcRenderer.invoke('graphy:create-dir', dirPath),
  moveFile: (sourcePath, destDir) =>
    ipcRenderer.invoke('graphy:move-file', { sourcePath, destDir }),
  deleteFile: (filePath) => ipcRenderer.invoke('graphy:delete-file', filePath),
  renameFile: (oldPath, newName) =>
    ipcRenderer.invoke('graphy:rename-file', { oldPath, newName }),
  readFile: (filePath) => ipcRenderer.invoke('graphy:read-file', filePath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke('graphy:write-file', { file: filePath, content }),
})

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.dataset.electron = process.platform
})

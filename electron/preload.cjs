const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('graphyDesktop', {
  platform: process.platform,
  readFunctionSource: (payload) => ipcRenderer.invoke('function:read', payload),
  writeFunctionSource: (payload) =>
    ipcRenderer.invoke('function:write', payload),
})

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.dataset.electron = process.platform
})

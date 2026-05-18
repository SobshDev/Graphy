const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('graphyDesktop', {
  platform: process.platform,
})

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.dataset.electron = process.platform
})

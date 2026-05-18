const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('graphyDesktop', {
  platform: process.platform,
})

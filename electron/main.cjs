const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const fs = require('node:fs')
const net = require('node:net')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const { applyMenu } = require('./menu.cjs')
const { parseFolder } = require('./parser-service.cjs')
const projectState = require('./project-state.cjs')
const { watchFolder } = require('./watcher.cjs')

app.setName('Graphy')
app.setAppUserModelId('com.ntgrm.graphy')

let mainWindow
let startedServerUrl
let currentFolder = null
let currentGraph = null
let parseError = null
let parseInFlight = null
let parseGeneration = 0
let stopWatcher = null

async function createWindow() {
  const startUrl =
    process.env.ELECTRON_START_URL || (await startBundledServer())

  const isMac = process.platform === 'darwin'

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 960,
    minHeight: 620,
    title: 'Graphy',
    backgroundColor: '#0a0a0a',
    show: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    if (stopWatcher) {
      stopWatcher()
      stopWatcher = null
    }
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(startUrl)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }

    return { action: 'allow' }
  })

  await mainWindow.loadURL(startUrl)
}

function getRecents() {
  return projectState.read(app).recentFolders
}

function refreshMenu() {
  applyMenu({
    recents: getRecents(),
    hasOpenFolder: currentFolder !== null,
    onOpenFolder: () => {
      void promptOpenFolder()
    },
    onOpenRecent: (folder) => {
      void openFolder(folder)
    },
    onClearRecents: () => {
      projectState.clearRecents(app)
      refreshMenu()
      broadcastProject()
    },
    onCloseFolder: () => {
      closeFolder()
    },
    onReload: () => {
      if (currentFolder) void runParse(currentFolder)
    },
  })
}

function broadcastProject() {
  if (!mainWindow) return
  mainWindow.webContents.send('project:set', {
    folder: currentFolder,
    recents: getRecents(),
  })
}

function broadcastGraph() {
  if (!mainWindow) return
  mainWindow.webContents.send('graph:set', {
    folder: currentFolder,
    graph: currentGraph,
    error: parseError,
    loading: parseInFlight !== null,
  })
}

async function promptOpenFolder() {
  const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return
  await openFolder(result.filePaths[0])
}

async function openFolder(folder) {
  const resolved = path.resolve(folder)
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    parseError = `Folder not found: ${resolved}`
    currentFolder = null
    currentGraph = null
    broadcastGraph()
    return
  }
  currentFolder = resolved
  projectState.recordFolder(app, resolved)
  refreshMenu()
  broadcastProject()

  if (stopWatcher) {
    stopWatcher()
    stopWatcher = null
  }
  stopWatcher = watchFolder(resolved, () => {
    if (currentFolder === resolved) {
      void runParse(resolved)
    }
  })

  await runParse(resolved)
}

async function runParse(folder) {
  const generation = ++parseGeneration
  parseError = null
  parseInFlight = folder
  broadcastGraph()

  try {
    const graph = await parseFolder(app, folder)
    if (generation !== parseGeneration) return
    currentGraph = graph
    parseError = null
  } catch (err) {
    if (generation !== parseGeneration) return
    parseError = err instanceof Error ? err.message : String(err)
    currentGraph = null
  } finally {
    if (generation === parseGeneration) {
      parseInFlight = null
      broadcastGraph()
    }
  }
}

function closeFolder() {
  parseGeneration += 1
  if (stopWatcher) {
    stopWatcher()
    stopWatcher = null
  }
  currentFolder = null
  currentGraph = null
  parseError = null
  parseInFlight = null
  refreshMenu()
  broadcastProject()
  broadcastGraph()
}

function registerIpc() {
  ipcMain.handle('graphy:get-initial-state', () => ({
    folder: currentFolder,
    recents: getRecents(),
    graph: currentGraph,
    error: parseError,
    loading: parseInFlight !== null,
  }))

  ipcMain.handle('graphy:open-folder', () => promptOpenFolder())
  ipcMain.handle('graphy:open-recent', (_e, folder) => openFolder(folder))
  ipcMain.handle('graphy:close-folder', () => {
    closeFolder()
  })
  ipcMain.handle('graphy:reload', () => {
    if (currentFolder) return runParse(currentFolder)
  })
  ipcMain.handle('graphy:clear-recents', () => {
    projectState.clearRecents(app)
    refreshMenu()
    broadcastProject()
  })
}

async function startBundledServer() {
  if (startedServerUrl) {
    return startedServerUrl
  }

  const serverEntry = findServerEntry()
  const port = await getAvailablePort()
  startedServerUrl = `http://127.0.0.1:${port}`

  process.env.HOST = '127.0.0.1'
  process.env.NITRO_HOST = '127.0.0.1'
  process.env.PORT = String(port)
  process.env.NITRO_PORT = String(port)

  await import(pathToFileURL(serverEntry).href)
  await waitForServer(startedServerUrl)

  return startedServerUrl
}

function findServerEntry() {
  const candidates = [
    path.join(app.getAppPath(), '.output', 'server', 'index.mjs'),
    path.join(app.getAppPath(), 'dist', 'server', 'index.mjs'),
    path.join(
      process.resourcesPath || '',
      'app',
      '.output',
      'server',
      'index.mjs',
    ),
    path.join(
      process.resourcesPath || '',
      'app',
      'dist',
      'server',
      'index.mjs',
    ),
  ]

  const serverEntry = candidates.find((candidate) => fs.existsSync(candidate))

  if (!serverEntry) {
    throw new Error(
      'Could not find a TanStack Start server build. Run "bun --bun run build" before starting Electron without ELECTRON_START_URL.',
    )
  }

  return serverEntry
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()

    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => {
        if (address && typeof address === 'object') {
          resolve(address.port)
          return
        }

        reject(new Error('Unable to find an available local port.'))
      })
    })
  })
}

async function waitForServer(url) {
  const deadline = Date.now() + 15_000

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)

      if (response.ok || response.status < 500) {
        return
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  }

  throw new Error(`TanStack Start server did not respond at ${url}.`)
}

app.whenReady().then(async () => {
  projectState.pruneMissing(app)
  registerIpc()
  refreshMenu()
  await createWindow()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

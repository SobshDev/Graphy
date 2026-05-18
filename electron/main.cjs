const { app, BrowserWindow, ipcMain, shell } = require('electron')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const net = require('node:net')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function resolveSafePath(root, file) {
  if (typeof root !== 'string' || typeof file !== 'string') {
    throw new Error('Invalid root or file path')
  }
  const absoluteRoot = path.resolve(root)
  const absoluteFile = path.resolve(absoluteRoot, file)
  const relative = path.relative(absoluteRoot, absoluteFile)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('File path escapes project root')
  }
  return absoluteFile
}

function detectLineEnding(text) {
  return text.includes('\r\n') ? '\r\n' : '\n'
}

function splitLines(text) {
  return text.split(/\r\n|\n/)
}

ipcMain.handle('function:read', async (_event, payload) => {
  const { root, file, startLine, endLine } = payload ?? {}
  const absolute = resolveSafePath(root, file)
  const raw = await fsp.readFile(absolute, 'utf8')
  const lines = splitLines(raw)
  const start = Math.max(1, Number(startLine) | 0)
  const end = Math.min(lines.length, Math.max(start, Number(endLine) | 0))
  const slice = lines.slice(start - 1, end).join('\n')
  return { source: slice, startLine: start, endLine: end }
})

ipcMain.handle('function:write', async (_event, payload) => {
  const { root, file, startLine, endLine, source } = payload ?? {}
  if (typeof source !== 'string') {
    throw new Error('Missing source content')
  }
  const absolute = resolveSafePath(root, file)
  const raw = await fsp.readFile(absolute, 'utf8')
  const eol = detectLineEnding(raw)
  const lines = splitLines(raw)
  const start = Math.max(1, Number(startLine) | 0)
  const end = Math.min(lines.length, Math.max(start, Number(endLine) | 0))
  const replacement = source.replace(/\r\n/g, '\n').split('\n')
  const next = [
    ...lines.slice(0, start - 1),
    ...replacement,
    ...lines.slice(end),
  ]
  await fsp.writeFile(absolute, next.join(eol), 'utf8')
  return { endLine: start - 1 + replacement.length }
})

app.setName('Graphy')
app.setAppUserModelId('com.ntgrm.graphy')

let mainWindow
let startedServerUrl

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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(startUrl)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }

    return { action: 'allow' }
  })

  await mainWindow.loadURL(startUrl)
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

app.whenReady().then(createWindow)

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

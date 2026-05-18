const { app, BrowserWindow, shell } = require('electron')
const fs = require('node:fs')
const net = require('node:net')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

app.setName('Graphy')
app.setAppUserModelId('com.ntgrm.graphy')

let mainWindow
let startedServerUrl

async function createWindow() {
  const startUrl =
    process.env.ELECTRON_START_URL || (await startBundledServer())

  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 960,
    minHeight: 620,
    title: 'Graphy',
    backgroundColor: '#e7f3ec',
    show: false,
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

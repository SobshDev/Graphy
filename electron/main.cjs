const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const net = require('node:net')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const IGNORED_DIRS = new Set(['.git'])

const { applyMenu } = require('./menu.cjs')
const { parseFolder } = require('./parser-service.cjs')
const projectState = require('./project-state.cjs')
const { watchFolder } = require('./watcher.cjs')

function getGitIgnoredPaths(root, paths) {
  if (paths.length === 0) return Promise.resolve(new Set())
  return new Promise((resolve) => {
    let child
    try {
      child = spawn('git', ['check-ignore', '--stdin', '-z'], { cwd: root })
    } catch {
      return resolve(new Set())
    }
    let out = ''
    child.stdout.on('data', (chunk) => {
      out += chunk.toString()
    })
    child.stderr.on('data', () => {})
    child.on('error', () => resolve(new Set()))
    child.on('close', (code) => {
      if (code !== 0 && code !== 1) return resolve(new Set())
      resolve(new Set(out.split('\0').filter(Boolean)))
    })
    child.stdin.on('error', () => {})
    child.stdin.write(paths.join('\0'))
    child.stdin.end()
  })
}

function collectPaths(node, out) {
  if (node.path) out.push(node.path)
  if (node.children) for (const c of node.children) collectPaths(c, out)
}

function markIgnored(node, ignoredSet, parentIgnored) {
  const isIgnored = parentIgnored || ignoredSet.has(node.path)
  if (isIgnored) node.ignored = true
  if (node.children) {
    for (const c of node.children) markIgnored(c, ignoredSet, isIgnored)
  }
}

async function resolveSafePath(file) {
  if (typeof file !== 'string') {
    throw new Error('Invalid file path')
  }
  if (!currentFolder) {
    throw new Error('No project folder is open')
  }
  const absoluteRoot = await fsp.realpath(currentFolder)
  const candidate = path.resolve(absoluteRoot, file)
  const absoluteFile = await fsp.realpath(candidate).catch((err) => {
    if (err && err.code === 'ENOENT') return candidate
    throw err
  })
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

app.setName('Graphy')
app.setAppUserModelId('com.ntgrm.graphy')

let mainWindow
let startedServerUrl
let currentFolder = null
let currentGraph = null
let currentLayout = null
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

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(1)
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1)
  })
  mainWindow.webContents.on('zoom-changed', () => {
    mainWindow.webContents.setZoomFactor(1)
  })
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const mod = input.control || input.meta
    if (!mod) return
    const key = input.key
    if (
      key === '+' ||
      key === '=' ||
      key === '-' ||
      key === '_' ||
      key === '0'
    ) {
      event.preventDefault()
    }
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
    layout: currentLayout,
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

  const cached = projectState.readCache(app, resolved)
  if (cached) {
    currentGraph = cached.graph
    currentLayout = cached.layout
    parseError = null
    broadcastGraph()
  }

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
    currentLayout = null
    parseError = null
    projectState.writeCache(app, folder, graph, null)
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
  currentLayout = null
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
    layout: currentLayout,
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
  ipcMain.handle('graphy:cache-layout', (_e, layout) => {
    if (currentFolder && currentGraph) {
      currentLayout = layout
      projectState.writeCache(app, currentFolder, currentGraph, layout)
    }
  })

  ipcMain.handle('graphy:file-tree', async () => {
    if (!currentFolder) return null
    const root = currentFolder

    async function walk(absPath) {
      const entries = await fsp.readdir(absPath, { withFileTypes: true })
      const nodes = []
      for (const entry of entries) {
        if (IGNORED_DIRS.has(entry.name)) continue
        const childAbs = path.join(absPath, entry.name)
        const rel = path.relative(root, childAbs)
        if (entry.isDirectory()) {
          nodes.push({
            name: entry.name,
            path: rel,
            kind: 'dir',
            children: await walk(childAbs),
          })
        } else if (entry.isFile()) {
          nodes.push({ name: entry.name, path: rel, kind: 'file' })
        }
      }
      nodes.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      })
      return nodes
    }

    const tree = {
      name: path.basename(root),
      path: '',
      kind: 'dir',
      children: await walk(root),
    }

    const allPaths = []
    for (const c of tree.children) collectPaths(c, allPaths)
    const ignoredSet = await getGitIgnoredPaths(root, allPaths)
    if (ignoredSet.size > 0) {
      for (const c of tree.children) markIgnored(c, ignoredSet, false)
    }

    return tree
  })

  ipcMain.handle('graphy:create-file', async (_event, filePath) => {
    const absolute = await resolveSafePath(filePath)
    if (!fs.existsSync(absolute)) {
      await fsp.writeFile(absolute, '', 'utf8')
    }
  })

  ipcMain.handle('graphy:create-dir', async (_event, dirPath) => {
    const absolute = await resolveSafePath(dirPath)
    await fsp.mkdir(absolute, { recursive: true })
  })

  ipcMain.handle('graphy:move-file', async (_event, payload) => {
    const { sourcePath, destDir } = payload ?? {}
    const absSrc = await resolveSafePath(sourcePath)
    const absDest = await resolveSafePath(destDir)
    const stat = await fsp.stat(absDest)
    if (!stat.isDirectory()) throw new Error('Destination is not a directory')
    const name = path.basename(absSrc)
    const target = path.join(absDest, name)
    await fsp.rename(absSrc, target)
  })

  ipcMain.handle('graphy:delete-file', async (_event, filePath) => {
    const absolute = await resolveSafePath(filePath)
    const stat = await fsp.stat(absolute)
    if (stat.isDirectory()) {
      await fsp.rm(absolute, { recursive: true })
    } else {
      await fsp.unlink(absolute)
    }
  })

  ipcMain.handle('graphy:rename-file', async (_event, payload) => {
    const { oldPath, newName } = payload ?? {}
    if (typeof newName !== 'string' || !newName.trim()) {
      throw new Error('Invalid new name')
    }
    const absolute = await resolveSafePath(oldPath)
    const newAbsolute = path.join(path.dirname(absolute), newName)
    const newRel = path.relative(await fsp.realpath(currentFolder), newAbsolute)
    if (newRel.startsWith('..') || path.isAbsolute(newRel)) {
      throw new Error('New name escapes project root')
    }
    await fsp.rename(absolute, newAbsolute)
    return { newPath: newRel }
  })

  ipcMain.handle('graphy:read-file', async (_event, filePath) => {
    const absolute = await resolveSafePath(filePath)
    return await fsp.readFile(absolute, 'utf8')
  })

  ipcMain.handle('graphy:write-file', async (_event, payload) => {
    const { file, content } = payload ?? {}
    if (typeof content !== 'string') throw new Error('Missing file content')
    const absolute = await resolveSafePath(file)
    await fsp.writeFile(absolute, content, 'utf8')
  })

  ipcMain.handle('graphy:search-text', async (_event, query) => {
    if (!currentFolder || typeof query !== 'string' || !query) return []
    const MAX_RESULTS = 1000
    const EXCLUDE_DIRS = [
      '.git',
      'node_modules',
      'dist',
      'dist-electron',
      '.output',
      '.next',
      '.nuxt',
    ]
    return new Promise((resolve) => {
      const args = ['-rn', '-I', '--fixed-strings']
      for (const dir of EXCLUDE_DIRS) args.push(`--exclude-dir=${dir}`)
      args.push('--', query, '.')
      const child = spawn('grep', args, { cwd: currentFolder })
      let out = ''
      child.stdout.on('data', (chunk) => {
        out += chunk.toString()
      })
      child.stderr.on('data', () => {})
      child.on('error', () => resolve([]))
      child.on('close', () => {
        const results = []
        for (const line of out.split('\n')) {
          if (!line) continue
          const match = line.match(/^(.+?):(\d+):(.*)$/)
          if (!match) continue
          let file = match[1]
          if (file.startsWith('./')) file = file.slice(2)
          results.push({
            file,
            line: Number(match[2]),
            column: 0,
            content: match[3],
          })
          if (results.length >= MAX_RESULTS) break
        }
        resolve(results)
      })
    })
  })

  ipcMain.handle('function:read', async (_event, payload) => {
    const { file, startLine, endLine } = payload ?? {}
    const absolute = await resolveSafePath(file)
    const raw = await fsp.readFile(absolute, 'utf8')
    const lines = splitLines(raw)
    const start = Math.max(1, Number(startLine) | 0)
    const end = Math.min(lines.length, Math.max(start, Number(endLine) | 0))
    const slice = lines.slice(start - 1, end).join('\n')
    return { source: slice, startLine: start, endLine: end }
  })

  ipcMain.handle('function:write', async (_event, payload) => {
    const { file, startLine, endLine, source } = payload ?? {}
    if (typeof source !== 'string') {
      throw new Error('Missing source content')
    }
    const absolute = await resolveSafePath(file)
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
  await projectState.pruneMissing(app)
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

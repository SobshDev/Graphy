const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const { spawn, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const net = require('node:net')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { simpleGit } = require('simple-git')

const IGNORED_DIRS = new Set(['.git'])

const ALLOWED_WEB_FETCH_HOSTS = new Set([
  'lucide.dev',
  'react.dev',
  'tanstack.com',
  'anthropic.com',
  'electronjs.org',
  'ts-morph.com',
  'bun.sh',
  'developer.mozilla.org',
])

function isAllowedFetchUrl(url) {
  try {
    const { protocol, hostname } = new URL(url)
    if (protocol !== 'https:') return false
    return [...ALLOWED_WEB_FETCH_HOSTS].some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    )
  } catch {
    return false
  }
}

function matchGlob(pattern, filePath) {
  const reStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\x00/g, '.*')
    .replace(/\?/g, '[^/]')
  return new RegExp(`^${reStr}$`).test(filePath)
}

const { applyMenu } = require('./menu.cjs')
const { parseFolder } = require('./parser-service.cjs')
const projectState = require('./project-state.cjs')
const { watchFolder, buildIgnoreSet } = require('./watcher.cjs')

let _gitCache = null
function getGit() {
  if (!currentFolder) throw new Error('No project folder is open')
  if (!_gitCache || _gitCache.folder !== currentFolder) {
    _gitCache = { folder: currentFolder, git: simpleGit(currentFolder) }
  }
  return _gitCache.git
}

const _spawnedScriptPids = new Set()

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

  ipcMain.handle('graphy:fs:read-file', async (_event, payload) => {
    const { path: filePath, startLine, endLine, maxBytes } = payload ?? {}
    const cap = typeof maxBytes === 'number' ? maxBytes : 65536
    let absolute
    try {
      absolute = await resolveSafePath(filePath)
    } catch {
      return { found: false, path: filePath }
    }
    let raw
    try {
      raw = await fsp.readFile(absolute, 'utf8')
    } catch (err) {
      if (err && err.code === 'ENOENT') return { found: false, path: filePath }
      throw err
    }
    const lines = splitLines(raw)
    const resolvedStart =
      typeof startLine === 'number' ? Math.max(1, startLine) : 1
    const resolvedEnd =
      typeof endLine === 'number'
        ? Math.min(lines.length, Math.max(resolvedStart, endLine))
        : lines.length
    let source = lines.slice(resolvedStart - 1, resolvedEnd).join('\n')
    let truncated = false
    if (Buffer.byteLength(source, 'utf8') > cap) {
      source = Buffer.from(source, 'utf8').slice(0, cap).toString('utf8')
      truncated = true
    }
    return {
      found: true,
      path: filePath,
      startLine: resolvedStart,
      endLine: resolvedEnd,
      source,
      truncated,
    }
  })

  ipcMain.handle('graphy:fs:search', async (_event, payload) => {
    const { query, regex, filePattern, maxResults } = payload ?? {}
    const cap = typeof maxResults === 'number' ? maxResults : 50
    const projectRoot = currentFolder
    if (!projectRoot) return { results: [], truncated: false }
    if (filePattern && filePattern.includes('..'))
      return { results: [], truncated: false }

    const results = []
    let truncated = false

    let rgAvailable = false
    try {
      const check = spawnSync('rg', ['--version'], { encoding: 'utf8' })
      rgAvailable = check.status === 0
    } catch {
      rgAvailable = false
    }

    if (rgAvailable) {
      const rgArgs = ['--json', `--max-count=${cap}`]
      if (regex) {
        rgArgs.push('-e', query)
      } else {
        rgArgs.push('--fixed-strings', '-e', query)
      }
      if (filePattern) rgArgs.push('--glob', filePattern)
      rgArgs.push('.')

      await new Promise((resolve) => {
        const proc = spawn('rg', rgArgs, { cwd: projectRoot })
        let buffer = ''
        proc.stdout.on('data', (chunk) => {
          buffer += chunk.toString()
          const rawLines = buffer.split('\n')
          buffer = rawLines.pop() ?? ''
          for (const line of rawLines) {
            if (!line.trim()) continue
            let parsed
            try {
              parsed = JSON.parse(line)
            } catch {
              continue
            }
            if (parsed.type === 'match') {
              const data = parsed.data
              const fp = data.path?.text ?? ''
              const lineNum = data.line_number ?? 0
              const submatches = data.submatches ?? []
              const matchText = submatches[0]?.match?.text ?? ''
              const previewRaw = data.lines?.text ?? ''
              const preview = previewRaw.slice(0, 200).replace(/\r?\n$/, '')
              results.push({
                file: fp,
                line: lineNum,
                match: matchText,
                preview,
              })
              if (results.length >= cap) {
                truncated = true
                proc.kill()
                break
              }
            }
          }
        })
        proc.on('close', resolve)
        proc.on('error', resolve)
      })
    } else {
      const ignoreSet = new Set(buildIgnoreSet(projectRoot))

      async function walkSearch(dir) {
        if (results.length >= cap) return
        let entries
        try {
          entries = await fsp.readdir(dir, { withFileTypes: true })
        } catch {
          return
        }
        for (const entry of entries) {
          if (results.length >= cap) {
            truncated = true
            break
          }
          if (ignoreSet.has(entry.name)) continue
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            await walkSearch(fullPath)
          } else if (entry.isFile()) {
            const relPath = path.relative(projectRoot, fullPath)
            if (filePattern && !matchGlob(filePattern, relPath)) continue
            let content
            try {
              content = await fsp.readFile(fullPath, 'utf8')
            } catch {
              continue
            }
            const fileLines = splitLines(content)
            let needle
            if (regex) {
              try {
                needle = new RegExp(query)
              } catch {
                continue
              }
            }
            const start = Date.now()
            for (let i = 0; i < fileLines.length; i++) {
              if (Date.now() - start > 50) break
              const text = fileLines[i]
              let matched = false
              let matchText = ''
              if (regex) {
                const m = needle.exec(text)
                if (m) {
                  matched = true
                  matchText = m[0]
                }
              } else {
                const idx = text.indexOf(query)
                if (idx !== -1) {
                  matched = true
                  matchText = query
                }
              }
              if (matched) {
                results.push({
                  file: relPath,
                  line: i + 1,
                  match: matchText,
                  preview: text.slice(0, 200),
                })
                if (results.length >= cap) {
                  truncated = true
                  break
                }
              }
            }
          }
        }
      }

      await walkSearch(projectRoot)
    }

    return { results, truncated }
  })

  ipcMain.handle('graphy:fs:list-files', async (_event, payload) => {
    const { pattern, dir, maxResults } = payload ?? {}
    const cap = typeof maxResults === 'number' ? maxResults : 200
    const projectRoot = currentFolder
    if (!projectRoot) return { files: [], truncated: false }

    const scanRoot = path.resolve(projectRoot, dir ?? '.')
    const scanRel = path.relative(projectRoot, scanRoot)
    if (scanRel.startsWith('..') || path.isAbsolute(scanRel)) {
      return { files: [], truncated: false }
    }

    const ignoreSet = new Set(buildIgnoreSet(projectRoot))
    const files = []
    let truncated = false

    async function walkList(current) {
      if (files.length >= cap) return
      let entries
      try {
        entries = await fsp.readdir(current, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        if (files.length >= cap) {
          truncated = true
          break
        }
        if (ignoreSet.has(entry.name)) continue
        const fullPath = path.join(current, entry.name)
        if (entry.isDirectory()) {
          await walkList(fullPath)
        } else if (entry.isFile()) {
          const relPath = path.relative(projectRoot, fullPath)
          if (pattern && !matchGlob(pattern, relPath)) continue
          files.push(relPath)
        }
      }
    }

    await walkList(scanRoot)
    files.sort()
    if (files.length > cap) {
      files.splice(cap)
      truncated = true
    }
    return { files, truncated }
  })

  ipcMain.handle('graphy:fs:apply-edit', async (_event, payload) => {
    const { file, oldString, newString, replaceAll } = payload ?? {}
    if (typeof oldString !== 'string' || typeof newString !== 'string') {
      throw new Error('Invalid payload for apply-edit')
    }
    const absolute = await resolveSafePath(file)
    const raw = await fsp.readFile(absolute, 'utf8')
    const count = raw.split(oldString).length - 1
    if (!replaceAll && count !== 1) {
      return { applied: false, file, replacements: count }
    }
    if (count === 0) {
      return { applied: false, file, replacements: 0 }
    }
    const eol = detectLineEnding(raw)
    const updated = replaceAll
      ? raw.split(oldString).join(newString)
      : raw.replace(oldString, newString)
    const normalized = updated.replace(/\r\n|\n/g, eol)
    await fsp.writeFile(absolute, normalized, 'utf8')
    if (currentFolder) void runParse(currentFolder)
    return { applied: true, file, replacements: replaceAll ? count : 1 }
  })

  ipcMain.handle('graphy:edits:rename-symbol', async (_event, payload) => {
    const { id, newName } = payload ?? {}
    if (typeof id !== 'string' || typeof newName !== 'string') {
      throw new Error('Invalid payload for rename-symbol')
    }
    if (!/^[A-Za-z_$][\w$]*$/.test(newName)) {
      return { applied: false, id, reason: 'newName is not a valid identifier' }
    }
    if (!currentFolder) throw new Error('No project folder is open')
    const sep = '::'
    const sepIdx = id.indexOf(sep)
    if (sepIdx === -1) {
      return {
        applied: false,
        id,
        reason: 'id does not contain "::" separator',
      }
    }
    const relFile = id.slice(0, sepIdx)
    const qualifiedName = id.slice(sepIdx + sep.length)
    const absolute = await resolveSafePath(relFile)
    const { Project } = require('ts-morph')
    const project = new Project({ skipAddingFilesFromTsConfig: true })
    project.addSourceFileAtPath(absolute)
    const sf = project.getSourceFile(absolute)
    if (!sf) {
      return {
        applied: false,
        id,
        reason: 'Source file not found in ts-morph project',
      }
    }
    const nameParts = qualifiedName.split('.')
    let node = null
    for (const decls of sf.getExportedDeclarations().values()) {
      for (const d of decls) {
        if (
          'getName' in d &&
          typeof d.getName === 'function' &&
          d.getName() === nameParts[0]
        ) {
          node = d
          break
        }
      }
      if (node) break
    }
    if (!node) {
      for (const s of sf.getStatements()) {
        if (
          'getName' in s &&
          typeof s.getName === 'function' &&
          s.getName() === nameParts[0]
        ) {
          node = s
          break
        }
      }
    }
    if (!node) {
      return {
        applied: false,
        id,
        reason: `Symbol "${nameParts[0]}" not found in ${relFile}`,
      }
    }
    if (!('rename' in node) || typeof node.rename !== 'function') {
      return {
        applied: false,
        id,
        reason: 'Located node does not support rename',
      }
    }
    node.rename(newName)
    await project.save()
    const changedFiles = project
      .getSourceFiles()
      .map((s) => path.relative(currentFolder, s.getFilePath()))
    const newQualifiedName = [newName, ...nameParts.slice(1)].join('.')
    const newId = `${relFile}${sep}${newQualifiedName}`
    if (currentFolder) void runParse(currentFolder)
    return { applied: true, id, newId, affectedFiles: changedFiles }
  })

  ipcMain.handle('graphy:graph:reparse', async () => {
    if (!currentFolder) throw new Error('No project folder is open')
    await runParse(currentFolder)
    return { ok: true }
  })

  ipcMain.handle('graphy:shell:run', (_event, payload) => {
    const ALLOWED = new Set(['lint', 'check', 'tidy', 'test'])
    const { script } = payload ?? {}
    if (!ALLOWED.has(script)) {
      throw new Error('script not allowed: ' + script)
    }
    if (!currentFolder) throw new Error('No project folder is open')
    const CAP = 65536
    return new Promise((resolve) => {
      const child = spawn('bun', ['run', script], {
        cwd: currentFolder,
        shell: false,
      })
      if (child.pid != null) _spawnedScriptPids.add(child.pid)
      let stdoutBuf = ''
      let stderrBuf = ''
      let truncated = false
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        if (child.pid != null) _spawnedScriptPids.delete(child.pid)
        resolve({
          exitCode: -1,
          stdout: stdoutBuf,
          stderr: stderrBuf,
          truncated: true,
        })
      }, 30_000)
      child.stdout.on('data', (chunk) => {
        if (stdoutBuf.length < CAP) stdoutBuf += chunk.toString()
        else truncated = true
      })
      child.stderr.on('data', (chunk) => {
        if (stderrBuf.length < CAP) stderrBuf += chunk.toString()
        else truncated = true
      })
      child.on('close', (code) => {
        clearTimeout(timer)
        if (child.pid != null) _spawnedScriptPids.delete(child.pid)
        resolve({
          exitCode: code ?? -1,
          stdout: stdoutBuf,
          stderr: stderrBuf,
          truncated,
        })
      })
    })
  })

  ipcMain.handle('graphy:git:status', async () => {
    const git = getGit()
    const status = await git.status()
    let branch = status.current
    if (!branch) {
      try {
        branch = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim() || null
      } catch {
        branch = null
      }
    }
    return {
      branch,
      staged: status.staged,
      unstaged: [
        ...status.modified,
        ...status.deleted,
        ...status.renamed.map((r) => r.to),
      ],
      untracked: status.not_added,
    }
  })

  ipcMain.handle('graphy:git:diff', async (_event, payload) => {
    const { file, staged, maxBytes } = payload ?? {}
    const git = getGit()
    const cap = typeof maxBytes === 'number' ? maxBytes : 32768
    const args = staged ? ['--cached'] : []
    if (typeof file === 'string' && file) args.push('--', file)
    const diff = await git.diff(args)
    if (diff.length > cap) {
      return { diff: diff.slice(0, cap), truncated: true }
    }
    return { diff, truncated: false }
  })

  ipcMain.handle('graphy:git:blame', (_event, payload) => {
    const { file, line, contextLines } = payload ?? {}
    if (!currentFolder || typeof file !== 'string' || !file) {
      throw new Error('file is required')
    }
    const ctx = typeof contextLines === 'number' ? contextLines : 5

    const result = spawnSync(
      'git',
      ['blame', '--porcelain', '--line-porcelain', '--', file],
      { cwd: currentFolder, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
    )
    if (result.error) throw result.error
    if (result.status !== 0) {
      throw new Error(result.stderr || 'git blame failed')
    }

    const lines = []
    const rawLines = result.stdout.split('\n')
    let lineNum = 0
    let sha = ''
    let author = ''
    let date = ''

    for (let i = 0; i < rawLines.length; i++) {
      const headerMatch = rawLines[i].match(/^([0-9a-f]{40}) \d+ (\d+)/)
      if (headerMatch) {
        sha = headerMatch[1]
        lineNum = parseInt(headerMatch[2], 10)
        author = ''
        date = ''
        continue
      }
      if (
        rawLines[i].startsWith('author ') &&
        !rawLines[i].startsWith('author-')
      ) {
        author = rawLines[i].slice(7)
        continue
      }
      if (rawLines[i].startsWith('author-time ')) {
        const ts = parseInt(rawLines[i].slice(12), 10)
        date = new Date(ts * 1000).toISOString().slice(0, 10)
        continue
      }
      if (rawLines[i].startsWith('\t')) {
        lines.push({
          line: lineNum,
          sha,
          author,
          date,
          content: rawLines[i].slice(1),
        })
      }
    }

    const filtered =
      typeof line === 'number'
        ? lines.filter((l) => l.line >= line - ctx && l.line <= line + ctx)
        : lines

    return { lines: filtered }
  })

  ipcMain.handle('graphy:ui:focus-node', (_event, payload) => {
    const { id } = payload ?? {}
    if (mainWindow) {
      mainWindow.webContents.send('graphy:ui:focus-node', { id })
    }
    return { ok: true, id }
  })

  ipcMain.handle('graphy:ts:type-at', async (_event, payload) => {
    const { file, line, column = 1 } = payload ?? {}
    try {
      const absolute = await resolveSafePath(file)
      const { Project, ts } = require('ts-morph')
      const tsConfigPath = currentFolder
        ? path.join(currentFolder, 'tsconfig.json')
        : null
      const hasTsConfig =
        tsConfigPath &&
        (await fsp
          .access(tsConfigPath)
          .then(() => true)
          .catch(() => false))
      let project
      if (hasTsConfig) {
        project = new Project({ tsConfigFilePath: tsConfigPath })
      } else {
        project = new Project({ skipAddingFilesFromTsConfig: true })
        project.addSourceFileAtPath(absolute)
      }
      const sourceFile = project.getSourceFile(absolute)
      if (!sourceFile) return { found: false }
      const offset = ts.getPositionOfLineAndCharacter(
        sourceFile.compilerNode,
        line - 1,
        column - 1,
      )
      const node = sourceFile.getDescendantAtPos(offset)
      if (!node) return { found: false }
      const type = node.getType()
      return {
        found: true,
        file: absolute,
        line,
        column,
        name: node.getSymbol()?.getName() ?? '',
        type: type.getText(),
        kind: node.getKindName(),
      }
    } catch {
      return { found: false }
    }
  })

  ipcMain.handle('graphy:web:fetch', async (_event, payload) => {
    const { url, maxBytes = 65536 } = payload ?? {}
    if (!isAllowedFetchUrl(url)) {
      return { ok: false, reason: 'Host not on allow-list' }
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15_000)
    try {
      const response = await fetch(url, { signal: controller.signal })
      const contentType = response.headers.get('content-type') ?? ''
      const reader = response.body.getReader()
      const chunks = []
      let total = 0
      let truncated = false
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (total + value.byteLength > maxBytes) {
          chunks.push(value.slice(0, maxBytes - total))
          total = maxBytes
          truncated = true
          reader.cancel()
          break
        }
        chunks.push(value)
        total += value.byteLength
      }
      const combined = new Uint8Array(total)
      let offset = 0
      for (const chunk of chunks) {
        combined.set(chunk, offset)
        offset += chunk.byteLength
      }
      const body = new TextDecoder().decode(combined)
      return { ok: true, contentType, body, truncated }
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : String(err),
      }
    } finally {
      clearTimeout(timer)
    }
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

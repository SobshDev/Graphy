const crypto = require('node:crypto')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')

const STATE_FILE = 'graphy-state.json'
const CACHE_DIR = 'graph-cache'
const MAX_RECENTS = 10

function statePath(app) {
  return path.join(app.getPath('userData'), STATE_FILE)
}

function read(app) {
  try {
    const raw = fs.readFileSync(statePath(app), 'utf8')
    const parsed = JSON.parse(raw)
    return {
      recentFolders: Array.isArray(parsed.recentFolders)
        ? parsed.recentFolders.filter((p) => typeof p === 'string')
        : [],
    }
  } catch {
    return { recentFolders: [] }
  }
}

function write(app, state) {
  fs.mkdirSync(path.dirname(statePath(app)), { recursive: true })
  fs.writeFileSync(statePath(app), JSON.stringify(state, null, 2))
}

function recordFolder(app, folder) {
  const state = read(app)
  const filtered = state.recentFolders.filter((p) => p !== folder)
  const recentFolders = [folder, ...filtered].slice(0, MAX_RECENTS)
  const next = { recentFolders }
  write(app, next)
  return next
}

function clearRecents(app) {
  const next = { recentFolders: [] }
  write(app, next)
  return next
}

async function pruneMissing(app) {
  const state = read(app)
  const checks = await Promise.all(
    state.recentFolders.map(async (p) => {
      try {
        return (await fsp.stat(p)).isDirectory()
      } catch {
        return false
      }
    }),
  )
  const recentFolders = state.recentFolders.filter((_, i) => checks[i])
  if (recentFolders.length === state.recentFolders.length) return state
  const next = { recentFolders }
  write(app, next)
  return next
}

function cacheDir(app) {
  return path.join(app.getPath('userData'), CACHE_DIR)
}

function cacheFile(app, folder) {
  const hash = crypto.createHash('sha256').update(folder).digest('hex')
  return path.join(cacheDir(app), `${hash}.json`)
}

function readCache(app, folder) {
  try {
    const raw = fs.readFileSync(cacheFile(app, folder), 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      graph: parsed.graph ?? null,
      layout: parsed.layout ?? null,
    }
  } catch {
    return null
  }
}

function writeCache(app, folder, graph, layout) {
  const dir = cacheDir(app)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(cacheFile(app, folder), JSON.stringify({ graph, layout }))
}

module.exports = {
  read,
  recordFolder,
  clearRecents,
  pruneMissing,
  readCache,
  writeCache,
}

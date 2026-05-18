const fs = require('node:fs')
const path = require('node:path')

const STATE_FILE = 'graphy-state.json'
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

function pruneMissing(app) {
  const state = read(app)
  const recentFolders = state.recentFolders.filter((p) => {
    try {
      return fs.statSync(p).isDirectory()
    } catch {
      return false
    }
  })
  if (recentFolders.length === state.recentFolders.length) return state
  const next = { recentFolders }
  write(app, next)
  return next
}

module.exports = { read, recordFolder, clearRecents, pruneMissing }

const fs = require('node:fs')
const path = require('node:path')

const chokidar = require('chokidar')

const DEFAULT_IGNORES = [
  'node_modules',
  '.git',
  '.graphy',
  'dist',
  'dist-ssr',
  'dist-electron',
  'build',
  '.output',
  '.nitro',
  '.tanstack',
  '.vinxi',
  '.wrangler',
  'release',
  '.DS_Store',
]

const DEBOUNCE_MS = 200

function readGitignorePatterns(root) {
  try {
    const raw = fs.readFileSync(path.join(root, '.gitignore'), 'utf8')
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
  } catch {
    return []
  }
}

function buildIgnoreSet(root) {
  const fromGit = readGitignorePatterns(root)
  const all = new Set([...DEFAULT_IGNORES, ...fromGit])
  return Array.from(all)
}

function watchFolder(root, onChange) {
  const ignored = buildIgnoreSet(root)
  const watcher = chokidar.watch(root, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
    ignored: (p) => {
      const rel = path.relative(root, p)
      if (!rel || rel.startsWith('..')) return false
      const segments = rel.split(path.sep)
      return segments.some((seg) => ignored.includes(seg))
    },
  })

  let timer = null
  const pending = new Set()

  const trigger = (filePath) => {
    if (filePath && !/\.(ts|tsx)$/.test(filePath)) return
    if (filePath) {
      const rel = path.relative(root, filePath)
      if (rel && !rel.startsWith('..')) pending.add(rel)
    }
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const changed = Array.from(pending)
      pending.clear()
      onChange(changed)
    }, DEBOUNCE_MS)
  }

  watcher.on('add', trigger)
  watcher.on('change', trigger)
  watcher.on('unlink', trigger)

  return () => {
    if (timer) clearTimeout(timer)
    void watcher.close()
  }
}

module.exports = { watchFolder, buildIgnoreSet }

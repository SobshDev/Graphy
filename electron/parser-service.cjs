const { fork } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const PARSER_TIMEOUT_MS = 5 * 60 * 1000

let child = null
let childBundleMtime = 0
let nextRequestId = 0
const pending = new Map()

function resolveParserBundle(app) {
  const candidates = [
    path.join(app.getAppPath(), 'dist-electron', 'parser.cjs'),
    path.join(
      process.resourcesPath || '',
      'app',
      'dist-electron',
      'parser.cjs',
    ),
  ]
  const found = candidates.find((p) => fs.existsSync(p))
  if (!found) {
    throw new Error(
      'Parser bundle not found. Run "bun run build:parser" before launching.',
    )
  }
  return found
}

function rejectAllPending(err) {
  for (const entry of pending.values()) {
    clearTimeout(entry.timer)
    entry.reject(err)
  }
  pending.clear()
}

function killChild() {
  if (!child) return
  const existing = child
  child = null
  existing.removeAllListeners()
  try {
    existing.kill('SIGKILL')
  } catch {
    // ignore — process may already be gone
  }
}

function ensureChild(app) {
  const bundlePath = resolveParserBundle(app)
  const mtime = fs.statSync(bundlePath).mtimeMs

  // Dev: when the parser bundle is rebuilt, recycle the worker so
  // the next request runs the freshly built code.
  if (child && mtime !== childBundleMtime) {
    rejectAllPending(new Error('Parser bundle changed; restarting worker'))
    killChild()
  }

  if (child) return child

  childBundleMtime = mtime
  child = fork(bundlePath, [], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  })

  child.on('message', (msg) => {
    if (!msg || typeof msg !== 'object' || typeof msg.id !== 'number') return
    const entry = pending.get(msg.id)
    if (!entry) return
    pending.delete(msg.id)
    clearTimeout(entry.timer)
    if (msg.type === 'result') {
      entry.resolve(msg.graph)
    } else if (msg.type === 'error') {
      entry.reject(new Error(msg.message))
    }
  })

  child.on('error', (err) => {
    rejectAllPending(err)
  })

  child.on('exit', (code, signal) => {
    child = null
    rejectAllPending(
      new Error(`Parser exited unexpectedly (code=${code}, signal=${signal})`),
    )
  })

  return child
}

function parseFolder(app, folder) {
  return new Promise((resolve, reject) => {
    let worker
    try {
      worker = ensureChild(app)
    } catch (err) {
      reject(err)
      return
    }

    const id = ++nextRequestId
    const timer = setTimeout(() => {
      pending.delete(id)
      // The worker may be wedged in a long parse; force a respawn so
      // the next request gets a clean state.
      killChild()
      reject(new Error(`Parser timed out after ${PARSER_TIMEOUT_MS}ms`))
    }, PARSER_TIMEOUT_MS)

    pending.set(id, { resolve, reject, timer })
    worker.send({ type: 'parse', id, folder })
  })
}

function disposeParser() {
  rejectAllPending(new Error('Parser disposed'))
  killChild()
}

module.exports = { parseFolder, disposeParser }

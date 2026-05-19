const { fork } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const PARSER_TIMEOUT_MS = 5 * 60 * 1000

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

function runParser(app, folder, { incremental = false, input = null } = {}) {
  return new Promise((resolve, reject) => {
    const bundlePath = resolveParserBundle(app)
    const args = incremental ? [folder, '--incremental'] : [folder]
    const child = fork(bundlePath, args, {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    })

    let settled = false
    const finish = (fn) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.removeAllListeners()
      fn()
    }

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish(() =>
        reject(new Error(`Parser timed out after ${PARSER_TIMEOUT_MS}ms`)),
      )
    }, PARSER_TIMEOUT_MS)

    child.on('message', (msg) => {
      if (!msg || typeof msg !== 'object') return
      if (msg.type === 'graph') {
        finish(() => resolve(msg.graph))
      } else if (msg.type === 'error') {
        finish(() => reject(new Error(msg.message)))
      }
    })

    child.on('error', (err) => {
      finish(() => reject(err))
    })

    child.on('exit', (code, signal) => {
      if (settled) return
      finish(() =>
        reject(
          new Error(
            `Parser exited unexpectedly (code=${code}, signal=${signal})`,
          ),
        ),
      )
    })

    if (incremental && input) {
      child.send({ type: 'input', ...input })
    }
  })
}

function parseFolder(app, folder) {
  return runParser(app, folder)
}

function parseFiles(app, folder, changedFiles, previousGraph) {
  return runParser(app, folder, {
    incremental: true,
    input: { changedFiles, previousGraph },
  })
}

module.exports = { parseFolder, parseFiles }

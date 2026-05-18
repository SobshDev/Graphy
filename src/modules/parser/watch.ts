import { watch } from 'node:fs'
import path from 'node:path'

import { dumpGraph } from './dump'

const cwd = process.cwd()
const root = process.argv[2]
  ? path.resolve(cwd, process.argv[2])
  : path.join(cwd, 'tests/fixtures')

const DEBOUNCE_MS = 100
const relevant = /\.(ts|tsx)$/

let timer: ReturnType<typeof setTimeout> | null = null
let pending = false
let running = false

function runDump(): void {
  if (running) {
    pending = true
    return
  }
  running = true
  try {
    const result = dumpGraph(root)
    console.log(`[parser:watch] ${result.nodes} nodes, ${result.edges} edges`)
  } catch (err) {
    console.error('[parser:watch] dump failed:', err)
  } finally {
    running = false
    if (pending) {
      pending = false
      runDump()
    }
  }
}

function schedule(): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(runDump, DEBOUNCE_MS)
}

runDump()

watch(root, { recursive: true }, (_event, filename) => {
  if (!filename) return
  if (!relevant.test(filename)) return
  schedule()
})

console.log(
  `[parser:watch] watching ${path.relative(cwd, root)} for *.ts changes`,
)

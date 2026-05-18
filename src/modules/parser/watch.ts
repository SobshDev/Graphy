import path from 'node:path'

import chokidar from 'chokidar'

import { dumpGraph } from './dump'

const cwd = process.cwd()
const root = process.argv[2]
  ? path.resolve(cwd, process.argv[2])
  : path.join(cwd, 'tests/fixtures')

function runDump(): void {
  try {
    const result = dumpGraph(root)
    console.log(`[parser:watch] ${result.nodes} nodes, ${result.edges} edges`)
  } catch (err) {
    console.error('[parser:watch] dump failed:', err)
  }
}

runDump()

const watcher = chokidar.watch(root, {
  ignoreInitial: true,
  ignored: (filePath, stats) =>
    stats?.isFile() === true && !/\.(ts|tsx)$/.test(filePath),
  awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 30 },
})

watcher.on('all', runDump)

console.log(
  `[parser:watch] watching ${path.relative(cwd, root)} for *.ts changes`,
)

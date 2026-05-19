import { mkdirSync } from 'node:fs'
import path from 'node:path'

import chokidar from 'chokidar'

declare const Bun: {
  build: (config: {
    entrypoints: string[]
    outdir: string
    naming: string
    target: 'node' | 'browser' | 'bun'
    format: 'cjs' | 'esm'
    external?: string[]
  }) => Promise<{ success: boolean; logs: unknown[] }>
}

const root = process.cwd()
const entry = path.join(root, 'src/modules/parser/parse-service.ts')
const outDir = path.join(root, 'dist-electron')
const outFile = 'parser.cjs'

const watch = process.argv.includes('--watch')

mkdirSync(outDir, { recursive: true })

async function build(): Promise<void> {
  const result = await Bun.build({
    entrypoints: [entry],
    outdir: outDir,
    naming: outFile,
    target: 'node',
    format: 'cjs',
    external: ['ts-morph', '@ts-morph/common', 'typescript'],
  })
  if (!result.success) {
    for (const log of result.logs) console.error(log)
    if (!watch) process.exit(1)
    return
  }
  console.log(`[build-parser] wrote dist-electron/${outFile}`)
}

await build()

if (watch) {
  const watcher = chokidar.watch(path.join(root, 'src/modules/parser'), {
    ignoreInitial: true,
    ignored: (p, stats) => stats?.isFile() === true && !/\.(ts|tsx)$/.test(p),
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 30 },
  })
  watcher.on('all', () => {
    build().catch((err) => console.error('[build-parser]', err))
  })
  console.log('[build-parser] watching src/modules/parser for changes')
}

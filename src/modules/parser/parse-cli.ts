import path from 'node:path'

import { parseFilesIncremental, parseProject } from './index'
import type { Graph } from './core/models'

type Outbound =
  | { type: 'graph'; graph: unknown }
  | { type: 'error'; message: string }

type Inbound = {
  type: 'input'
  changedFiles: string[]
  previousGraph: Graph
}

function emit(message: Outbound): Promise<void> {
  return new Promise((resolve) => {
    if (typeof process.send === 'function') {
      process.send(message, undefined, undefined, () => resolve())
      return
    }
    if (message.type === 'graph') {
      process.stdout.write(JSON.stringify(message.graph))
    } else {
      process.stderr.write(`${message.message}\n`)
    }
    resolve()
  })
}

function waitForInput(timeoutMs: number): Promise<Inbound> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('parser-cli: timed out waiting for incremental input'))
    }, timeoutMs)
    process.on('message', (msg: unknown) => {
      if (
        msg &&
        typeof msg === 'object' &&
        (msg as { type?: string }).type === 'input'
      ) {
        clearTimeout(timer)
        resolve(msg as Inbound)
      }
    })
  })
}

async function main(): Promise<void> {
  const rawArg = process.argv[2]
  if (!rawArg) {
    await emit({
      type: 'error',
      message: 'parser-cli: missing folder argument',
    })
    process.exit(2)
  }

  const root = path.resolve(rawArg)
  const incremental = process.argv.includes('--incremental')

  try {
    let graph
    if (incremental) {
      const input = await waitForInput(30_000)
      graph = parseFilesIncremental(
        root,
        input.changedFiles,
        input.previousGraph,
      )
    } else {
      graph = parseProject(root)
    }
    await emit({ type: 'graph', graph })
    process.exit(0)
  } catch (err) {
    await emit({
      type: 'error',
      message: err instanceof Error ? (err.stack ?? err.message) : String(err),
    })
    process.exit(1)
  }
}

void main()

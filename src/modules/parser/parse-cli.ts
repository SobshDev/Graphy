import path from 'node:path'

import { parseProject } from './index'

type Outbound =
  | { type: 'graph'; graph: unknown }
  | { type: 'error'; message: string }

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

async function main(): Promise<void> {
  const rawArg = process.argv[2]
  if (!rawArg) {
    await emit({ type: 'error', message: 'parser-cli: missing folder argument' })
    process.exit(2)
  }

  const root = path.resolve(rawArg)

  try {
    const graph = parseProject(root)
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

import path from 'node:path'

import { parseProject } from './index'

type Incoming = { type: 'parse'; id: number; folder: string }

type Outgoing =
  | { type: 'result'; id: number; graph: unknown }
  | { type: 'error'; id: number; message: string }

if (typeof process.send !== 'function') {
  process.stderr.write('parser-service must be spawned via fork() with IPC\n')
  process.exit(2)
}

function send(message: Outgoing): void {
  process.send!(message)
}

function handle(message: Incoming): void {
  try {
    const graph = parseProject(path.resolve(message.folder))
    send({ type: 'result', id: message.id, graph })
  } catch (err) {
    send({
      type: 'error',
      id: message.id,
      message: err instanceof Error ? (err.stack ?? err.message) : String(err),
    })
  }
}

process.on('message', (raw) => {
  if (!raw || typeof raw !== 'object') return
  const candidate = raw as { type?: unknown }
  if (candidate.type !== 'parse') return
  handle(raw as Incoming)
})

process.on('disconnect', () => {
  process.exit(0)
})

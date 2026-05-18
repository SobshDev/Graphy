import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import path from 'node:path'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const GRAPH_OUTPUT = path.resolve(process.cwd(), 'public/sample-graph.json')
const GRAPH_UPDATE_EVENT = 'graphy:graph-updated'

function graphReloadPlugin() {
  return {
    name: 'graphy-graph-reload',
    configureServer(server: {
      watcher: {
        add: (paths: string) => void
        on: (event: string, handler: (file: string) => void) => void
      }
      ws: { send: (payload: { type: 'custom'; event: string }) => void }
    }) {
      server.watcher.add(GRAPH_OUTPUT)
      const notify = (file: string) => {
        if (path.resolve(file) !== GRAPH_OUTPUT) return
        server.ws.send({ type: 'custom', event: GRAPH_UPDATE_EVENT })
      }
      server.watcher.on('add', notify)
      server.watcher.on('change', notify)
    },
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({
      preset: 'node-server',
      rollupConfig: { external: [/^@sentry\//] },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    graphReloadPlugin(),
  ],
})

export default config

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="min-h-screen place-content-center bg-neutral-950 px-6 text-center text-white">
      <h1 className="text-5xl font-bold tracking-tight">Hello world.</h1>
      <p className="mt-4 text-lg text-neutral-400">
        Graphy tourne dans Electron. Tranquille.
      </p>
    </main>
  )
}

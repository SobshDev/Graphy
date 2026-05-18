import { createFileRoute } from '@tanstack/react-router'
import { ReactFlowProvider } from '@xyflow/react'

import { Canvas } from '@/modules/graph/components/canvas'
import { Sidebar } from '@/app/layout/sidebar'
import { TopBar } from '@/app/layout/top-bar'
import { TooltipProvider } from '@/shared/ui/tooltip'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <ReactFlowProvider>
        <main className="bg-canvas text-foreground flex h-screen w-screen overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <Canvas />
          </div>
        </main>
      </ReactFlowProvider>
    </TooltipProvider>
  )
}

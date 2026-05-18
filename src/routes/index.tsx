import { createFileRoute } from '@tanstack/react-router'
import { ReactFlowProvider } from '@xyflow/react'

import { Sidebar } from '@/app/layout/sidebar'
import { TopBar } from '@/app/layout/top-bar'
import { AiChatPanel, AiChatProvider } from '@/modules/ai-chat'
import { FileEditor, FileExplorer, useOpenFile } from '@/modules/files'
import { Canvas } from '@/modules/graph/components/canvas'
import { SourceControlPanel } from '@/modules/source-control'
import { useActiveView } from '@/shared/lib/active-view'
import { TooltipProvider } from '@/shared/ui/tooltip'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <ReactFlowProvider>
        <AiChatProvider>
          <main className="bg-canvas text-foreground flex h-screen w-screen overflow-hidden">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <TopBar />
              <div className="flex min-h-0 flex-1">
                <FileExplorer />
                <SourceControlPanel />
                <MainContent />
              </div>
            </div>
            <AiChatPanel />
          </main>
        </AiChatProvider>
      </ReactFlowProvider>
    </TooltipProvider>
  )
}

function MainContent() {
  const activeView = useActiveView()
  const openFile = useOpenFile()

  if (activeView === 'editor' && openFile) return <FileEditor />
  return <Canvas />
}

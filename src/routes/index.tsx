import { createFileRoute } from '@tanstack/react-router'
import { ReactFlowProvider } from '@xyflow/react'

import { Sidebar } from '@/app/layout/sidebar'
import { TopBar } from '@/app/layout/top-bar'
import { AiChatPanel, AiChatProvider } from '@/modules/ai-chat'
import { FileEditor, FileExplorer, useOpenFile } from '@/modules/files'
import { Canvas } from '@/modules/graph/components/canvas'
import { SettingsPage } from '@/modules/settings'
import { SourceControlPanel } from '@/modules/source-control'
import { ThemeBootstrap } from '@/modules/themes'
import { useActiveView } from '@/shared/lib/active-view'
import { useSettingsOpen } from '@/shared/lib/settings-open'
import { Toaster } from '@/shared/ui/sonner'
import { TooltipProvider } from '@/shared/ui/tooltip'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const settingsOpen = useSettingsOpen()

  return (
    <TooltipProvider delayDuration={200}>
      <ReactFlowProvider>
        <AiChatProvider>
          <ThemeBootstrap />
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
          {settingsOpen && (
            <div className="bg-canvas text-foreground fixed inset-0 z-50 flex overflow-hidden">
              <SettingsPage />
            </div>
          )}
          <Toaster />
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

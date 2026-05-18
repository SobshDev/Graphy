import { createFileRoute } from '@tanstack/react-router'

import { Sidebar } from '@/app/layout/sidebar'
import { SettingsPage, SettingsTopBar } from '@/modules/settings'
import { TooltipProvider } from '@/shared/ui/tooltip'

export const Route = createFileRoute('/settings')({ component: SettingsRoute })

function SettingsRoute() {
  return (
    <TooltipProvider delayDuration={200}>
      <main className="bg-canvas text-foreground flex h-screen w-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <SettingsTopBar />
          <SettingsPage />
        </div>
      </main>
    </TooltipProvider>
  )
}

import { createFileRoute } from '@tanstack/react-router'

import { SettingsPage } from '@/modules/settings'
import { TooltipProvider } from '@/shared/ui/tooltip'

export const Route = createFileRoute('/settings')({ component: SettingsRoute })

function SettingsRoute() {
  return (
    <TooltipProvider delayDuration={200}>
      <main className="bg-canvas text-foreground fixed inset-0 flex overflow-hidden">
        <SettingsPage />
      </main>
    </TooltipProvider>
  )
}

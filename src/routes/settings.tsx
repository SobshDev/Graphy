import { createFileRoute } from '@tanstack/react-router'

import { SettingsPage } from '@/modules/settings'
import { ThemeBootstrap } from '@/modules/themes'
import { TooltipProvider } from '@/shared/ui/tooltip'

export const Route = createFileRoute('/settings')({ component: SettingsRoute })

function SettingsRoute() {
  return (
    <TooltipProvider delayDuration={200}>
      <ThemeBootstrap />
      <main className="bg-canvas text-foreground fixed inset-0 flex overflow-hidden">
        <SettingsPage />
      </main>
    </TooltipProvider>
  )
}

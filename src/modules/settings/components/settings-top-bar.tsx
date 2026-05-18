import { ChevronRight } from 'lucide-react'

export function SettingsTopBar() {
  return (
    <header className="bg-sidebar border-sidebar-border app-drag titlebar-inset flex h-12 shrink-0 items-center border-b pl-5 pr-3">
      <div className="flex items-center gap-2 font-mono text-[12px]">
        <span className="text-muted-foreground/60">graphy</span>
        <ChevronRight
          className="text-muted-foreground/60 size-3"
          strokeWidth={1.8}
        />
        <span className="text-foreground">preferences</span>
      </div>
    </header>
  )
}

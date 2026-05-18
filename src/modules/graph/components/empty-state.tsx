import { FolderOpen, History } from 'lucide-react'

import { Button } from '@/shared/ui/button'

export interface EmptyStateProps {
  recents: string[]
  onOpenFolder: () => void
  onOpenRecent: (folder: string) => void
}

export function EmptyState({
  recents,
  onOpenFolder,
  onOpenRecent,
}: EmptyStateProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <FolderOpen
            className="text-muted-foreground/60 size-10"
            strokeWidth={1.4}
          />
          <h2 className="text-foreground text-base font-medium">
            No folder open
          </h2>
          <p className="text-muted-foreground font-mono text-xs">
            Open a TypeScript project to visualize it as a graph.
          </p>
        </div>

        <Button onClick={onOpenFolder} className="gap-2" size="sm">
          <FolderOpen className="size-4" strokeWidth={1.6} />
          Open Folder…
        </Button>

        {recents.length > 0 && (
          <div className="flex w-full flex-col gap-2">
            <div className="text-muted-foreground/80 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider">
              <History className="size-3" strokeWidth={1.6} />
              Recent
            </div>
            <ul className="flex w-full flex-col gap-0.5">
              {recents.map((folder) => (
                <li key={folder}>
                  <button
                    type="button"
                    onClick={() => onOpenRecent(folder)}
                    className="hover:bg-muted/60 text-foreground/90 w-full truncate rounded px-2 py-1.5 text-left font-mono text-xs"
                    title={folder}
                  >
                    {folder}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

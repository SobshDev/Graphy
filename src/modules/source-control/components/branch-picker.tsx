import { useState } from 'react'
import { ChevronsUpDown, GitBranch, Globe } from 'lucide-react'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'

import type { GitBranches } from '../services/git-history'

export function BranchPicker({
  branches,
  selected,
  onSelect,
}: {
  branches: GitBranches
  selected: string | undefined
  onSelect: (branch: string | undefined) => void
}) {
  const [open, setOpen] = useState(false)

  const active = selected ?? branches.current
  const allLocal = [branches.current, ...branches.local].filter(
    (b): b is string => b !== null,
  )

  const localSet = new Set(allLocal)
  const remoteOnly = branches.remote.filter((r) => {
    const short = r.replace(/^[^/]+\//, '')
    return !localSet.has(short)
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hover:bg-sidebar-accent/60 flex min-w-0 flex-1 items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors"
        >
          <GitBranch
            className="text-muted-foreground size-3.5 shrink-0"
            strokeWidth={1.8}
          />
          <span
            className="text-foreground/90 min-w-0 truncate text-[12px] font-medium"
            title={active ?? ''}
          >
            {active ?? 'No branch'}
          </span>
          <ChevronsUpDown
            className="text-muted-foreground/50 size-3 shrink-0"
            strokeWidth={2}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandInput placeholder="Search branches…" />
          <CommandList>
            <CommandEmpty>No branches found</CommandEmpty>
            {allLocal.length > 0 && (
              <CommandGroup heading="Local">
                {allLocal.map((branch) => (
                  <CommandItem
                    key={branch}
                    value={branch}
                    data-checked={branch === active}
                    onSelect={() => {
                      onSelect(branch === branches.current ? undefined : branch)
                      setOpen(false)
                    }}
                  >
                    <GitBranch className="size-3.5" strokeWidth={1.6} />
                    <span className="truncate">{branch}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {remoteOnly.length > 0 && (
              <CommandGroup heading="Remote">
                {remoteOnly.map((branch) => (
                  <CommandItem
                    key={branch}
                    value={branch}
                    data-checked={branch === active}
                    onSelect={() => {
                      onSelect(branch)
                      setOpen(false)
                    }}
                  >
                    <Globe className="size-3.5" strokeWidth={1.6} />
                    <span className="truncate">{branch}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

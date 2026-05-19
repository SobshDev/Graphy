import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, File, Search, X } from 'lucide-react'

import { openFile } from '@/modules/files'
import { useActivePanel } from '@/shared/lib/active-panel'
import { cn } from '@/shared/lib/utils'

import type { FileGroup } from '../hooks/use-search'
import { useSearch } from '../hooks/use-search'

export function SearchPanel() {
  const open = useActivePanel() === 'search'
  const { status, results, search, clear } = useSearch()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (!value.trim()) {
        clear()
        return
      }
      debounceRef.current = setTimeout(() => search(value), 250)
    },
    [search, clear],
  )

  const handleClear = useCallback(() => {
    setQuery('')
    clear()
    inputRef.current?.focus()
  }, [clear])

  if (!open) return null

  const totalMatches = results
    ? results.reduce((sum, g) => sum + g.matches.length, 0)
    : 0

  return (
    <aside className="bg-sidebar border-sidebar-border flex w-72 shrink-0 flex-col border-r">
      <div className="text-muted-foreground/70 px-3 py-2 text-[11px] font-medium uppercase tracking-wider">
        Search
      </div>

      <div className="border-sidebar-border/60 border-b px-2 pb-2">
        <div className="bg-input/30 border-input focus-within:border-ring focus-within:ring-ring/50 flex items-center gap-1.5 rounded-md border px-2 py-1 focus-within:ring-1">
          <Search
            className="text-muted-foreground/50 size-3.5 shrink-0"
            strokeWidth={1.8}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search text…"
            className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground/40"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground/50 hover:text-foreground shrink-0"
            >
              <X className="size-3.5" strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto pb-2">
        {status === 'idle' && (
          <div className="flex flex-col items-center gap-2 px-3 pt-8 text-center">
            <Search
              className="text-muted-foreground/30 size-8"
              strokeWidth={1.2}
            />
            <span className="text-muted-foreground/50 text-[12px]">
              Type to search across files
            </span>
          </div>
        )}

        {status === 'searching' && (
          <div className="text-muted-foreground/60 px-3 py-2 text-[12px]">
            Searching…
          </div>
        )}

        {status === 'error' && (
          <div className="text-muted-foreground/60 px-3 py-2 text-[12px]">
            Search failed
          </div>
        )}

        {status === 'ready' && results.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-3 pt-8 text-center">
            <Search
              className="text-muted-foreground/30 size-8"
              strokeWidth={1.2}
            />
            <span className="text-muted-foreground/50 text-[12px]">
              No results found
            </span>
          </div>
        )}

        {status === 'ready' && results.length > 0 && (
          <>
            <div className="text-muted-foreground/40 px-3 py-1.5 text-[10.5px]">
              {totalMatches} result{totalMatches !== 1 ? 's' : ''} in{' '}
              {results.length} file{results.length !== 1 ? 's' : ''}
            </div>
            {results.map((group) => (
              <FileGroupItem key={group.file} group={group} query={query} />
            ))}
          </>
        )}
      </div>
    </aside>
  )
}

function FileGroupItem({ group, query }: { group: FileGroup; query: string }) {
  const [expanded, setExpanded] = useState(true)
  const fileName = group.file.split('/').pop() ?? group.file

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="hover:bg-sidebar-accent flex w-full items-center gap-1 px-2 py-0.5 text-left"
      >
        {expanded ? (
          <ChevronDown
            className="text-muted-foreground/50 size-3.5 shrink-0"
            strokeWidth={1.8}
          />
        ) : (
          <ChevronRight
            className="text-muted-foreground/50 size-3.5 shrink-0"
            strokeWidth={1.8}
          />
        )}
        <File
          className="text-muted-foreground/60 size-3.5 shrink-0"
          strokeWidth={1.6}
        />
        <span className="truncate text-[12.5px]">{fileName}</span>
        <span className="text-muted-foreground/40 ml-auto shrink-0 text-[10.5px]">
          {group.matches.length}
        </span>
      </button>

      {expanded && (
        <div className="text-muted-foreground/50 truncate px-2 pb-0.5 text-[10px]">
          {group.file}
        </div>
      )}

      {expanded &&
        group.matches.map((m, i) => (
          <MatchLine
            key={i}
            file={group.file}
            fileName={fileName}
            line={m.line}
            content={m.content}
            query={query}
          />
        ))}
    </div>
  )
}

function MatchLine({
  file,
  fileName,
  line,
  content,
  query,
}: {
  file: string
  fileName: string
  line: number
  content: string
  query: string
}) {
  const handleClick = () => {
    openFile(file, fileName)
  }

  const parts = highlightMatch(content, query)

  return (
    <button
      type="button"
      onClick={handleClick}
      className="hover:bg-sidebar-accent group flex w-full items-baseline gap-1.5 px-3 py-px pl-8 text-left"
    >
      <span className="text-muted-foreground/30 shrink-0 text-[10px] tabular-nums">
        {line}
      </span>
      <span className="truncate text-[12px]">
        {parts.map((part, i) => (
          <span
            key={i}
            className={cn(
              part.highlight
                ? 'bg-yellow-500/25 text-foreground'
                : 'text-muted-foreground/70',
            )}
          >
            {part.text}
          </span>
        ))}
      </span>
    </button>
  )
}

function highlightMatch(content: string, query: string) {
  const parts: Array<{ text: string; highlight: boolean }> = []
  const lower = content.toLowerCase()
  const queryLower = query.toLowerCase()
  let cursor = 0

  while (cursor < content.length) {
    const idx = lower.indexOf(queryLower, cursor)
    if (idx === -1) {
      parts.push({ text: content.slice(cursor), highlight: false })
      break
    }
    if (idx > cursor) {
      parts.push({ text: content.slice(cursor, idx), highlight: false })
    }
    parts.push({
      text: content.slice(idx, idx + query.length),
      highlight: true,
    })
    cursor = idx + query.length
  }

  return parts
}

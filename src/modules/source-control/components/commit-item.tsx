import { useState } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

import { avatarColor, initials } from '../lib/avatar-color'
import { formatFullDate, relativeTime } from '../lib/relative-time'
import type { GitCommit } from '../services/git-history'

type RefKind = 'head' | 'branch' | 'remote' | 'tag'

function parseRefs(refs: string): Array<{ label: string; kind: RefKind }> {
  if (!refs) return []
  return refs
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      if (r.startsWith('HEAD -> ')) {
        return { label: r.slice('HEAD -> '.length), kind: 'head' }
      }
      if (r === 'HEAD') return { label: 'HEAD', kind: 'head' }
      if (r.startsWith('tag: ')) {
        return { label: r.slice('tag: '.length), kind: 'tag' }
      }
      if (r.startsWith('origin/')) return { label: r, kind: 'remote' }
      return { label: r, kind: 'branch' }
    })
}

const REF_STYLES: Record<RefKind, string> = {
  head: 'bg-primary/15 text-primary border-primary/30',
  branch: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  remote: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  tag: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

export function CommitItem({ commit }: { commit: GitCommit }) {
  const [expanded, setExpanded] = useState(false)
  const refs = parseRefs(commit.refs)
  const color = avatarColor(commit.email || commit.author)

  const toggle = () => setExpanded((v) => !v)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      className="hover:bg-sidebar-accent/60 hover:border-l-primary/40 group cursor-pointer border-l-2 border-transparent px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggle()
        }
      }}
    >
      <div className="flex items-start gap-2">
        <div
          className={`${color} mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white`}
          title={commit.author}
        >
          {initials(commit.author)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div
              className={`text-foreground text-[12.5px] leading-tight ${
                expanded ? '' : 'truncate'
              }`}
              title={commit.subject}
            >
              {commit.subject}
            </div>
          </div>

          {refs.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {refs.map((ref) => (
                <span
                  key={ref.label + ref.kind}
                  className={`rounded border px-1 py-px text-[9.5px] font-medium leading-none ${REF_STYLES[ref.kind]}`}
                >
                  {ref.label}
                </span>
              ))}
            </div>
          )}

          <div className="text-muted-foreground/70 mt-1 flex items-center gap-1.5 text-[11px]">
            <span className="truncate">{commit.author}</span>
            <span className="opacity-50">•</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="shrink-0">{relativeTime(commit.date)}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {formatFullDate(commit.date)}
              </TooltipContent>
            </Tooltip>
          </div>

          {expanded && commit.body && (
            <pre className="text-muted-foreground/80 mt-2 whitespace-pre-wrap break-words font-sans text-[11.5px] leading-snug">
              {commit.body}
            </pre>
          )}
        </div>

        <span className="text-muted-foreground/60 mt-0.5 shrink-0 font-mono text-[10.5px]">
          {commit.shortHash}
        </span>
      </div>
    </div>
  )
}

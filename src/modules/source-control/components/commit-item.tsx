import { useState } from 'react'
import { Check, Copy, GitMerge, GitPullRequest } from 'lucide-react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

import { formatFullDate, relativeTime } from '../lib/relative-time'
import type { GitCommit } from '../services/git-history'
import { GraphCommitLine, GraphConnectorLine } from './commit-graph'

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

export function CommitItem({
  commit,
  graphWidth,
}: {
  commit: GitCommit
  graphWidth: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const refs = parseRefs(commit.refs)

  const toggle = () => setExpanded((v) => !v)

  const copyHash = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(commit.hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const commitRaw = commit.graphLines[0]?.raw ?? ''

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      className="hover:bg-sidebar-accent/50 group flex cursor-pointer items-stretch transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggle()
        }
      }}
    >
      <div className="shrink-0 pl-1">
        <GraphCommitLine raw={commitRaw} graphWidth={graphWidth} />
      </div>

      <div className="min-w-0 flex-1 py-1 pr-3">
        <div
          className={`text-foreground/90 text-[12px] leading-snug ${expanded ? '' : 'truncate'}`}
          title={commit.subject}
        >
          {commit.subject}
        </div>

        {(refs.length > 0 || commit.pr || commit.isMerge) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {commit.pr && (
              <span className="flex items-center gap-0.5 rounded border border-purple-500/30 bg-purple-500/15 px-1 py-px text-[9px] font-medium leading-none text-purple-400">
                <GitPullRequest className="size-2.5" strokeWidth={2} />#
                {commit.pr}
              </span>
            )}
            {commit.isMerge && (
              <span className="flex items-center gap-0.5 rounded border border-violet-500/30 bg-violet-500/15 px-1 py-px text-[9px] font-medium leading-none text-violet-400">
                <GitMerge className="size-2.5" strokeWidth={2} />
                merge
              </span>
            )}
            {refs.map((ref) => (
              <span
                key={ref.label + ref.kind}
                className={`rounded border px-1 py-px text-[9px] font-medium leading-none ${REF_STYLES[ref.kind]}`}
              >
                {ref.label}
              </span>
            ))}
          </div>
        )}

        <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground/60">
          <span className="truncate">{commit.author}</span>
          <span className="opacity-40">·</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0">{relativeTime(commit.date)}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {formatFullDate(commit.date)}
            </TooltipContent>
          </Tooltip>
          <span className="opacity-40">·</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={copyHash}
                className="inline-flex shrink-0 items-center gap-0.5 font-mono transition-colors hover:text-foreground"
              >
                {commit.shortHash}
                {copied ? (
                  <Check
                    className="size-2.5 text-emerald-400"
                    strokeWidth={2.5}
                  />
                ) : (
                  <Copy
                    className="size-2.5 opacity-0 group-hover:opacity-60"
                    strokeWidth={2}
                  />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {copied ? 'Copied!' : 'Copy full hash'}
            </TooltipContent>
          </Tooltip>
        </div>

        {expanded && commit.body && (
          <pre className="mt-1.5 whitespace-pre-wrap break-words font-sans text-[11px] leading-snug text-muted-foreground/70">
            {commit.body}
          </pre>
        )}
      </div>
    </div>
  )
}

const CONNECTOR_H = 12

export function GraphConnector({
  raw,
  graphWidth,
}: {
  raw: string
  graphWidth: number
}) {
  return (
    <div className="pl-1" style={{ height: CONNECTOR_H }}>
      <GraphConnectorLine
        raw={raw}
        height={CONNECTOR_H}
        graphWidth={graphWidth}
      />
    </div>
  )
}

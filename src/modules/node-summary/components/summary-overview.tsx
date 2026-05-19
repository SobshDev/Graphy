import { openSettings } from '@/shared/lib/settings-open'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

import type { SummaryStatus } from '../types'

type SummaryOverviewProps = {
  paragraphs: string[]
  status: SummaryStatus
  error: string | null
  onRetry: () => void
}

export function SummaryOverview({
  paragraphs,
  status,
  error,
  onRetry,
}: SummaryOverviewProps) {
  if (status === 'no-key') {
    return <NoKeyState />
  }

  if (status === 'error') {
    return (
      <div className="border-destructive/40 bg-destructive/5 text-destructive flex flex-col gap-2 rounded-md border px-3 py-3 text-xs">
        <span>{error ?? 'Failed to generate summary.'}</span>
        <div>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'loading' || status === 'validating') {
    return <LoadingState label={statusLabel(status)} />
  }

  const showCursor = status === 'streaming'
  return (
    <div className="flex flex-col gap-3">
      {paragraphs.length === 0 && showCursor && (
        <Skeleton className="h-3 w-2/3" />
      )}
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap"
        >
          {paragraph}
          {showCursor && index === paragraphs.length - 1 && (
            <span className="text-muted-foreground ml-0.5 inline-block animate-pulse">
              ▍
            </span>
          )}
        </p>
      ))}
    </div>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground text-[11px] tracking-wide uppercase">
        {label}
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-11/12" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

function NoKeyState() {
  return (
    <div className="border-border/60 bg-muted/30 flex flex-col gap-2 rounded-md border px-3 py-3 text-xs">
      <span className="text-muted-foreground">
        Add a Claude API key in settings to generate node summaries.
      </span>
      <div>
        <Button variant="outline" size="sm" onClick={openSettings}>
          Open settings
        </Button>
      </div>
    </div>
  )
}

function statusLabel(status: SummaryStatus): string {
  if (status === 'validating') return 'Checking cached summary…'
  return 'Generating summary…'
}

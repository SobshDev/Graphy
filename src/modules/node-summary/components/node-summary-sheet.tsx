import { FileCode, RefreshCw, Sparkles } from 'lucide-react'

import { openFile } from '@/modules/files/lib/open-file'
import { Button } from '@/shared/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'

import { useNodeSummary } from '../hooks/use-node-summary'
import type { NodeSummaryDependency, NodeSummaryTarget } from '../types'

type NodeSummarySheetProps = {
  target: NodeSummaryTarget | null
  onOpenChange: (open: boolean) => void
}

export function NodeSummarySheet({
  target,
  onOpenChange,
}: NodeSummarySheetProps) {
  const { uses, usedBy, overview, status, error, refresh } =
    useNodeSummary(target)
  const open = target !== null
  const busy = status === 'loading' || status === 'streaming'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-[480px]"
      >
        <SheetHeader className="border-border/60 border-b">
          <div className="flex items-center justify-between gap-2">
            <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
              <Sparkles size={11} strokeWidth={1.8} />
              <span>Node summary</span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={refresh}
              disabled={!target || busy}
              title="Regenerate summary"
              className="-mr-1"
            >
              <RefreshCw size={13} strokeWidth={1.7} />
              <span className="sr-only">Regenerate summary</span>
            </Button>
          </div>
          <SheetTitle className="truncate font-mono text-[13px]">
            {target?.displayName ?? 'Node'}
          </SheetTitle>
          <SheetDescription className="truncate font-mono text-[11px]">
            {target?.file ?? ''}
          </SheetDescription>
        </SheetHeader>

        {target && (
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
            <section className="flex flex-col gap-2">
              <h3 className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                Overview
              </h3>
              <SummaryBody
                paragraphs={overview}
                status={status}
                error={error}
                onRetry={refresh}
              />
            </section>

            <DependencyList
              title="Uses"
              emptyLabel="No outgoing dependencies."
              items={uses}
            />

            <DependencyList
              title="Used by"
              emptyLabel="No incoming dependencies."
              items={usedBy}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function SummaryBody({
  paragraphs,
  status,
  error,
  onRetry,
}: {
  paragraphs: string[]
  status: ReturnType<typeof useNodeSummary>['status']
  error: string | null
  onRetry: () => void
}) {
  if (status === 'no-key') {
    return (
      <p className="text-muted-foreground text-[12px] leading-relaxed">
        Configure an AI API key in Settings to enable summaries.
      </p>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-destructive text-[12px] leading-relaxed">
          {error ?? 'Failed to generate summary.'}
        </p>
        <Button size="xs" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    )
  }

  if (paragraphs.length === 0) {
    return (
      <p className="text-muted-foreground text-[12px] leading-relaxed">
        {status === 'streaming'
          ? 'Generating summary…'
          : status === 'loading'
            ? 'Loading…'
            : 'No summary yet.'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className="text-foreground/90 text-[13px] leading-relaxed"
        >
          {paragraph}
        </p>
      ))}
    </div>
  )
}

function DependencyList({
  title,
  emptyLabel,
  items,
}: {
  title: string
  emptyLabel: string
  items: NodeSummaryDependency[]
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="text-muted-foreground flex items-center justify-between text-[10px] font-semibold tracking-wider uppercase">
        <span>{title}</span>
        <span className="font-mono normal-case">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground/80 text-[12px]">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.file}>
              <button
                type="button"
                onClick={() => openFile(item.file, item.displayName)}
                className="hover:bg-muted/60 group flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left transition-colors"
                title={item.file}
              >
                <FileCode
                  size={12}
                  strokeWidth={1.7}
                  className="text-muted-foreground/80 shrink-0"
                />
                <span className="text-foreground/90 truncate font-mono text-[11.5px]">
                  {item.displayName}
                </span>
                <span className="text-muted-foreground/60 ml-auto truncate font-mono text-[10px]">
                  {item.file}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

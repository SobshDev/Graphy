import { FileCode, RefreshCw, Sparkles } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'

import { useNodeSummary } from '../hooks/use-node-summary'
import { SummaryFacts } from './summary-facts'
import { SummaryOverview } from './summary-overview'
import { SummaryRelationsList } from './summary-relations-list'

type NodeSummarySheetProps = {
  nodeId: string | null
  onOpenChange: (open: boolean) => void
}

export function NodeSummarySheet({
  nodeId,
  onOpenChange,
}: NodeSummarySheetProps) {
  const { header, callers, callees, overview, status, error, refresh } =
    useNodeSummary(nodeId)
  const open = nodeId !== null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-[640px]"
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
              disabled={
                !header || status === 'streaming' || status === 'validating'
              }
              title="Regenerate summary"
              className="-mr-1"
            >
              <RefreshCw size={13} strokeWidth={1.7} />
              <span className="sr-only">Regenerate summary</span>
            </Button>
          </div>
          <SheetTitle className="truncate font-mono text-[13px]">
            {header?.displayName ?? 'Node'}
          </SheetTitle>
          <SheetDescription className="truncate font-mono text-[11px]">
            {header ? `${header.file}:${header.line}` : ''}
          </SheetDescription>
        </SheetHeader>

        {header && (
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
            <SummaryFacts facts={header.facts} />

            {header.signature && (
              <div className="bg-muted/30 border-border/60 rounded-md border px-3 py-2 font-mono text-[11.5px]">
                <span className="text-foreground">{header.displayName}</span>
                <span className="text-muted-foreground">
                  {header.signature}
                </span>
              </div>
            )}

            <section className="flex flex-col gap-2">
              <h3 className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                Overview
              </h3>
              <SummaryOverview
                paragraphs={overview}
                status={status}
                error={error}
                onRetry={refresh}
              />
            </section>

            <SummaryRelationsList
              title="Used by"
              emptyLabel="No callers found."
              items={callers}
            />

            <SummaryRelationsList
              title="Uses"
              emptyLabel="No dependencies found."
              items={callees}
            />
          </div>
        )}

        <SheetFooter className="border-border/60 flex-row items-center justify-between border-t">
          <Button variant="ghost" size="sm" onClick={() => {}}>
            <FileCode size={14} strokeWidth={1.7} />
            Open code
          </Button>
          <Button size="sm" onClick={() => {}}>
            <Sparkles size={14} strokeWidth={1.7} />
            Ask AI
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

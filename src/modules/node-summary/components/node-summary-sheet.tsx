import { FileCode, Sparkles } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'

import type { NodeSummaryTarget } from '../types'
import { SummaryFacts } from './summary-facts'
import { SummaryRelationsList } from './summary-relations-list'

type NodeSummarySheetProps = {
  target: NodeSummaryTarget | null
  onOpenChange: (open: boolean) => void
}

export function NodeSummarySheet({
  target,
  onOpenChange,
}: NodeSummarySheetProps) {
  const open = target !== null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-[640px]"
      >
        <SheetHeader className="border-border/60 border-b">
          <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
            <Sparkles size={11} strokeWidth={1.8} />
            <span>Node summary</span>
          </div>
          <SheetTitle className="truncate font-mono text-[13px]">
            {target?.displayName ?? 'Node'}
          </SheetTitle>
          <SheetDescription className="truncate font-mono text-[11px]">
            {target ? `${target.file}:${target.line}` : ''}
          </SheetDescription>
        </SheetHeader>

        {target && (
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
            <SummaryFacts facts={target.facts} />

            {target.signature && (
              <div className="bg-muted/30 border-border/60 rounded-md border px-3 py-2 font-mono text-[11.5px]">
                <span className="text-foreground">{target.displayName}</span>
                <span className="text-muted-foreground">
                  {target.signature}
                </span>
              </div>
            )}

            <section className="flex flex-col gap-2">
              <h3 className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                Overview
              </h3>
              <div className="flex flex-col gap-3">
                {target.overview.map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-foreground/90 text-sm leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            <SummaryRelationsList
              title="Used by"
              emptyLabel="No callers found."
              items={target.callers}
            />

            <SummaryRelationsList
              title="Uses"
              emptyLabel="No dependencies found."
              items={target.callees}
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

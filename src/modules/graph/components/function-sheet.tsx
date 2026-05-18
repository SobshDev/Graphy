import { useEffect, useState } from 'react'

import { Button } from '@/shared/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'

import { CodeEditor } from './code-editor'

const TAB_SIZE_STORAGE_KEY = 'graphy:function-editor:tab-size'

function readStoredTabSize(): 2 | 4 {
  if (typeof window === 'undefined') return 4
  const stored = window.localStorage.getItem(TAB_SIZE_STORAGE_KEY)
  return stored === '2' ? 2 : 4
}

export type FunctionSheetTarget = {
  displayName: string
  file: string
  startLine: number
  endLine: number
}

type FunctionSheetProps = {
  root: string | null
  target: FunctionSheetTarget | null
  onOpenChange: (open: boolean) => void
  onSaved?: (next: { endLine: number }) => void
}

type Status = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

export function FunctionSheet({
  root,
  target,
  onOpenChange,
  onSaved,
}: FunctionSheetProps) {
  const [original, setOriginal] = useState('')
  const [draft, setDraft] = useState('')
  const [resolvedEndLine, setResolvedEndLine] = useState<number | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [tabSize, setTabSize] = useState<2 | 4>(readStoredTabSize)

  function handleTabSizeChange(value: string) {
    if (value !== '2' && value !== '4') return
    const next = value === '2' ? 2 : 4
    setTabSize(next)
    window.localStorage.setItem(TAB_SIZE_STORAGE_KEY, String(next))
  }

  const open = target !== null

  useEffect(() => {
    if (!target || !root) return
    const desktop = window.graphyDesktop
    if (!desktop?.readFunctionSource) {
      setStatus('error')
      setErrorMessage(
        'Function editing requires the Graphy desktop app (Electron).',
      )
      return
    }

    let cancelled = false
    setStatus('loading')
    setErrorMessage(null)
    desktop
      .readFunctionSource({
        root,
        file: target.file,
        startLine: target.startLine,
        endLine: target.endLine,
      })
      .then((result) => {
        if (cancelled) return
        setOriginal(result.source)
        setDraft(result.source)
        setResolvedEndLine(result.endLine)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setErrorMessage(err instanceof Error ? err.message : String(err))
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [open, root, target])

  const dirty = status === 'ready' && draft !== original
  const isTsx = target?.file.endsWith('.tsx') ? 'tsx' : 'ts'

  async function handleSave() {
    if (!target || !root || resolvedEndLine === null) return
    const desktop = window.graphyDesktop
    if (!desktop?.writeFunctionSource) return

    setStatus('saving')
    setErrorMessage(null)
    try {
      const result = await desktop.writeFunctionSource({
        root,
        file: target.file,
        startLine: target.startLine,
        endLine: resolvedEndLine,
        source: draft,
      })
      setOriginal(draft)
      setResolvedEndLine(result.endLine)
      setStatus('ready')
      onSaved?.({ endLine: result.endLine })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-[640px]"
      >
        <SheetHeader className="border-border/60 border-b">
          <SheetTitle className="truncate font-mono text-[13px]">
            {target?.displayName ?? 'Function'}
          </SheetTitle>
          <SheetDescription className="truncate font-mono text-[11px]">
            {target ? `${target.file}:${target.startLine}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="relative min-h-0 flex-1">
          {status === 'loading' && (
            <div className="text-muted-foreground flex h-full items-center justify-center font-mono text-xs">
              Loading source…
            </div>
          )}
          {status === 'error' && (
            <div className="text-destructive flex h-full items-center justify-center p-6 text-center font-mono text-xs">
              {errorMessage ?? 'Failed to load source'}
            </div>
          )}
          {(status === 'ready' || status === 'saving') && (
            <CodeEditor
              value={draft}
              onChange={setDraft}
              language={isTsx}
              tabSize={tabSize}
            />
          )}
        </div>

        <SheetFooter className="border-border/60 flex-row items-center justify-between border-t">
          <div className="flex items-center gap-3">
            <ToggleGroup
              type="single"
              size="sm"
              value={String(tabSize)}
              onValueChange={handleTabSizeChange}
              className="font-mono text-[11px]"
            >
              <ToggleGroupItem value="2" aria-label="2 spaces indent">
                2sp
              </ToggleGroupItem>
              <ToggleGroupItem value="4" aria-label="4 spaces indent">
                4sp
              </ToggleGroupItem>
            </ToggleGroup>
            <span className="text-muted-foreground font-mono text-[11px]">
              {dirty ? 'Unsaved changes' : status === 'ready' ? 'Saved' : ''}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDraft(original)}
              disabled={!dirty}
            >
              Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!dirty}>
              {status === 'saving' ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

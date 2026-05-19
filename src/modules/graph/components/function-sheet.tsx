import { useEffect, useState } from 'react'

import { openFile } from '@/modules/files/lib/open-file'
import { getDesktop } from '@/shared/lib/desktop'
import { Button } from '@/shared/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'

import { CodeEditor } from './code-editor'

export type FunctionSheetTarget = {
  displayName: string
  file: string
  line: number
}

type FunctionSheetProps = {
  target: FunctionSheetTarget | null
  onOpenChange: (open: boolean) => void
}

type Status = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

export function FunctionSheet({ target, onOpenChange }: FunctionSheetProps) {
  const [original, setOriginal] = useState('')
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const open = target !== null

  useEffect(() => {
    if (!target) return
    const desktop = getDesktop()
    if (!desktop?.readFile) {
      setStatus('error')
      setErrorMessage(
        'File editing requires the Graphy desktop app (Electron).',
      )
      return
    }

    let cancelled = false
    setStatus('loading')
    setErrorMessage(null)
    desktop
      .readFile(target.file)
      .then((source) => {
        if (cancelled) return
        setOriginal(source)
        setDraft(source)
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
  }, [target])

  const dirty = status === 'ready' && draft !== original
  const isTsx = target?.file.endsWith('.tsx') ? 'tsx' : 'ts'

  async function handleSave() {
    if (!target) return
    const desktop = getDesktop()
    if (!desktop?.writeFile) return

    setStatus('saving')
    setErrorMessage(null)
    try {
      await desktop.writeFile(target.file, draft)
      setOriginal(draft)
      setStatus('ready')
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
          <SheetDescription asChild>
            <button
              type="button"
              className="hover:text-foreground truncate text-left font-mono text-[11px] transition-colors"
              onClick={() => {
                if (!target) return
                const name = target.file.split('/').pop() ?? target.file
                openFile(target.file, name)
              }}
            >
              {target ? `${target.file}:${target.line}` : ''}
            </button>
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
              scrollToLine={target?.line}
            />
          )}
        </div>

        <SheetFooter className="border-border/60 flex-row items-center justify-end border-t">
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

import { forwardRef, useRef, useState } from 'react'
import { File, Folder } from 'lucide-react'

export const NewEntryInput = forwardRef<
  HTMLInputElement,
  {
    kind: 'file' | 'dir'
    onCommit: (name: string) => void
    onCancel: () => void
  }
>(function NewEntryInput({ kind, onCommit, onCancel }, ref) {
  const [value, setValue] = useState('')
  const doneRef = useRef(false)
  const Icon = kind === 'dir' ? Folder : File

  const submit = () => {
    if (doneRef.current) return
    doneRef.current = true
    value.trim() ? onCommit(value) : onCancel()
  }

  return (
    <div
      className="flex items-center gap-1.5 py-1 pr-2"
      style={{ paddingLeft: 20 }}
    >
      <Icon
        className="text-muted-foreground size-3.5 shrink-0"
        strokeWidth={1.6}
      />
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={submit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') {
            doneRef.current = true
            onCancel()
          }
        }}
        placeholder={kind === 'dir' ? 'folder name' : 'file name'}
        className="bg-input text-foreground min-w-0 flex-1 rounded px-1 py-0 text-[12px] outline-none ring-1 ring-blue-500"
      />
    </div>
  )
})

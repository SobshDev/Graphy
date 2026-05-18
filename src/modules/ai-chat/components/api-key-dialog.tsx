import { useEffect, useState } from 'react'

import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'

import type { AiProvider } from '../types'
import { AI_PROVIDER_KEY_PLACEHOLDERS, AI_PROVIDER_LABELS } from '../types'

interface ApiKeyDialogProps {
  provider: AiProvider | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (provider: AiProvider, key: string) => void
}

export function ApiKeyDialog({
  provider,
  open,
  onOpenChange,
  onSave,
}: ApiKeyDialogProps) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) setValue('')
  }, [open, provider])

  if (!provider) return null

  const label = AI_PROVIDER_LABELS[provider]
  const placeholder = AI_PROVIDER_KEY_PLACEHOLDERS[provider]
  const trimmed = value.trim()
  const canSave = trimmed.length > 0

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    onSave(provider, trimmed)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Enter {label} API key</DialogTitle>
            <DialogDescription>
              Stored locally in this browser. Used to call the {label} API.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              type="password"
              autoFocus
              placeholder={placeholder}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

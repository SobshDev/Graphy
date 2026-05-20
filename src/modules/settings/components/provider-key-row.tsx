import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  useAiChat,
  AI_PROVIDER_KEY_PLACEHOLDERS,
  AI_PROVIDER_LABELS,
} from '@/modules/ai-chat'
import type { AiProvider } from '@/modules/ai-chat'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

import { SettingRow } from './setting-row'

type ProviderKeyRowProps = {
  provider: AiProvider
}

export function ProviderKeyRow({ provider }: ProviderKeyRowProps) {
  const { keys, setKey, removeKey } = useAiChat()
  const storedKey = keys[provider] ?? ''
  const [value, setValue] = useState(storedKey)
  const [reveal, setReveal] = useState(false)

  useEffect(() => {
    setValue(storedKey)
  }, [storedKey])

  const trimmed = value.trim()
  const canSave = trimmed !== storedKey

  const handleSave = () => {
    if (trimmed.length === 0) {
      removeKey(provider)
      setReveal(false)
    } else {
      setKey(provider, trimmed)
    }
  }

  return (
    <SettingRow
      label={AI_PROVIDER_LABELS[provider]}
      hint="Stored locally in this browser. Empty the field and save to remove."
      align="center"
    >
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          type={reveal ? 'text' : 'password'}
          placeholder={AI_PROVIDER_KEY_PLACEHOLDERS[provider]}
          className="bg-background/60 h-8 w-[220px] font-mono text-[12px] tracking-wider"
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? 'Hide key' : 'Reveal key'}
        >
          {reveal ? (
            <EyeOff className="size-3.5" strokeWidth={1.7} />
          ) : (
            <Eye className="size-3.5" strokeWidth={1.7} />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canSave}
          onClick={handleSave}
        >
          Save
        </Button>
      </div>
    </SettingRow>
  )
}

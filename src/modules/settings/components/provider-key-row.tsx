import { Eye, EyeOff, Trash2 } from 'lucide-react'
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
  const canSave = trimmed.length > 0 && trimmed !== storedKey
  const canRemove = storedKey.length > 0

  return (
    <SettingRow
      label={AI_PROVIDER_LABELS[provider]}
      hint="Stored locally in this browser."
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
          onClick={() => setKey(provider, trimmed)}
        >
          Save
        </Button>
        {canRemove ? (
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            onClick={() => {
              removeKey(provider)
              setValue('')
              setReveal(false)
            }}
            aria-label={`Remove ${AI_PROVIDER_LABELS[provider]} key`}
          >
            <Trash2 className="size-3.5" strokeWidth={1.7} />
          </Button>
        ) : null}
      </div>
    </SettingRow>
  )
}

import { useState } from 'react'
import { Eye, EyeOff, Sparkles, Terminal } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'

import { SettingCard } from './setting-card'
import { SettingRow } from './setting-row'

type Provider = 'claude' | 'codex'

const providers: Array<{
  id: Provider
  label: string
  icon: typeof Sparkles
  models: Array<{ id: string; label: string }>
}> = [
  {
    id: 'claude',
    label: 'Anthropic Claude',
    icon: Sparkles,
    models: [
      { id: 'opus-4.7', label: 'claude-opus-4-7' },
      { id: 'sonnet-4.6', label: 'claude-sonnet-4-6' },
      { id: 'haiku-4.5', label: 'claude-haiku-4-5' },
    ],
  },
  {
    id: 'codex',
    label: 'OpenAI Codex',
    icon: Terminal,
    models: [
      { id: 'codex-gpt5', label: 'codex-gpt-5' },
      { id: 'codex-gpt4', label: 'codex-gpt-4' },
    ],
  },
]

export function SectionAi() {
  const [provider, setProvider] = useState<Provider>('claude')
  const [model, setModel] = useState('opus-4.7')
  const [revealKey, setRevealKey] = useState(false)
  const [apiKey, setApiKey] = useState('sk-ant-xxxxxxxxxxxxxxxxxxxx9p4f')

  const active = providers.find((p) => p.id === provider) ?? providers[0]

  return (
    <SettingCard>
      <SettingRow label="Provider" align="start">
        <div
          role="radiogroup"
          aria-label="Provider"
          className="flex items-center gap-1.5"
        >
          {providers.map(({ id, label, icon: Icon }) => {
            const selected = provider === id
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setProvider(id)
                  const next = providers.find((p) => p.id === id)
                  if (next) {
                    setModel(next.models[0].id)
                  }
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[12.5px] transition-colors outline-none',
                  selected
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-background/40 text-muted-foreground hover:border-foreground/40 hover:text-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'size-3.5',
                    selected ? 'text-primary' : 'text-muted-foreground/80',
                  )}
                  strokeWidth={1.7}
                />
                {label}
              </button>
            )
          })}
        </div>
      </SettingRow>

      <SettingRow label="Model">
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="bg-background/60 h-8 w-[220px] font-mono text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {active.models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow label="API key">
        <div className="flex items-center gap-2">
          <Input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            type={revealKey ? 'text' : 'password'}
            className="bg-background/60 h-8 w-[220px] font-mono text-[12px] tracking-wider"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setRevealKey((v) => !v)}
            aria-label={revealKey ? 'Hide key' : 'Reveal key'}
          >
            {revealKey ? (
              <EyeOff className="size-3.5" strokeWidth={1.7} />
            ) : (
              <Eye className="size-3.5" strokeWidth={1.7} />
            )}
          </Button>
        </div>
      </SettingRow>
    </SettingCard>
  )
}

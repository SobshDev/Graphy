import { useState } from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Switch } from '@/shared/ui/switch'

import { SettingCard } from './setting-card'
import { SettingRow } from './setting-row'

const swatches = [
  { id: 'lime', value: 'oklch(0.768 0.233 130.85)' },
  { id: 'cyan', value: 'oklch(0.78 0.155 215)' },
  { id: 'magenta', value: 'oklch(0.72 0.235 330)' },
  { id: 'amber', value: 'oklch(0.82 0.18 75)' },
  { id: 'crimson', value: 'oklch(0.68 0.225 22)' },
  { id: 'violet', value: 'oklch(0.7 0.2 285)' },
]

export function SectionAppearance() {
  const [accent, setAccent] = useState('lime')
  const [font, setFont] = useState('geist')
  const [reduceMotion, setReduceMotion] = useState(false)

  return (
    <SettingCard>
      <SettingRow label="Accent">
        <div className="flex items-center gap-2">
          {swatches.map((swatch) => {
            const selected = accent === swatch.id
            return (
              <button
                key={swatch.id}
                type="button"
                onClick={() => setAccent(swatch.id)}
                aria-label={swatch.id}
                aria-pressed={selected}
                className="relative inline-flex h-7 w-7 items-center justify-center rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <span
                  className="size-5 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  style={{ background: swatch.value }}
                />
                {selected ? (
                  <Check
                    className="text-background absolute size-3"
                    strokeWidth={2.5}
                  />
                ) : null}
                <span
                  className={cn(
                    'pointer-events-none absolute inset-0 rounded-full ring-2 ring-offset-2 ring-offset-card transition-opacity',
                    selected ? 'opacity-100' : 'opacity-0',
                  )}
                  style={{ ['--tw-ring-color' as string]: swatch.value }}
                />
              </button>
            )
          })}
        </div>
      </SettingRow>

      <SettingRow label="Font">
        <Select value={font} onValueChange={setFont}>
          <SelectTrigger className="bg-background/60 h-8 w-[180px] font-mono text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="geist">Geist Variable</SelectItem>
            <SelectItem value="inter">Inter</SelectItem>
            <SelectItem value="jetbrains">JetBrains Mono</SelectItem>
            <SelectItem value="iosevka">Iosevka</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow label="Reduce motion">
        <Switch
          checked={reduceMotion}
          onCheckedChange={setReduceMotion}
          aria-label="Reduce motion"
        />
      </SettingRow>
    </SettingCard>
  )
}

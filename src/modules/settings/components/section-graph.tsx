import { useState } from 'react'

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

type EdgeStyle = 'smooth' | 'step' | 'straight'

const edgePreviews: Record<EdgeStyle, string> = {
  smooth: 'M2 32 C 20 32, 28 4, 46 4',
  step: 'M2 32 L 24 32 L 24 4 L 46 4',
  straight: 'M2 32 L 46 4',
}

const edgeLabels: Record<EdgeStyle, string> = {
  smooth: 'Smooth',
  step: 'Step',
  straight: 'Straight',
}

export function SectionGraph() {
  const [layout, setLayout] = useState('dagre-tb')
  const [edge, setEdge] = useState<EdgeStyle>('smooth')
  const [autofit, setAutofit] = useState(true)

  return (
    <SettingCard>
      <SettingRow label="Layout">
        <Select value={layout} onValueChange={setLayout}>
          <SelectTrigger className="bg-background/60 h-8 w-[220px] font-mono text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dagre-tb">Dagre · top → bottom</SelectItem>
            <SelectItem value="dagre-lr">Dagre · left → right</SelectItem>
            <SelectItem value="elk">ELK · layered</SelectItem>
            <SelectItem value="force">Force-directed</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow label="Edge style" align="start">
        <div
          role="radiogroup"
          aria-label="Edge style"
          className="flex items-stretch gap-1.5"
        >
          {(Object.keys(edgePreviews) as Array<EdgeStyle>).map((style) => {
            const selected = edge === style
            return (
              <button
                key={style}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setEdge(style)}
                className={cn(
                  'flex w-[88px] flex-col items-center gap-1.5 rounded-md border p-2 transition-colors outline-none',
                  selected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background/40 hover:border-foreground/40',
                )}
              >
                <svg
                  viewBox="0 0 48 36"
                  fill="none"
                  className="h-7 w-full"
                  aria-hidden
                >
                  <circle
                    cx="2.5"
                    cy="32"
                    r="2"
                    className={
                      selected ? 'fill-primary' : 'fill-muted-foreground/60'
                    }
                  />
                  <circle
                    cx="45.5"
                    cy="4"
                    r="2"
                    className={
                      selected ? 'fill-primary' : 'fill-muted-foreground/60'
                    }
                  />
                  <path
                    d={edgePreviews[style]}
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    className={
                      selected ? 'stroke-primary' : 'stroke-muted-foreground/70'
                    }
                  />
                </svg>
                <span
                  className={cn(
                    'text-[11.5px]',
                    selected ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {edgeLabels[style]}
                </span>
              </button>
            )
          })}
        </div>
      </SettingRow>

      <SettingRow label="Auto-fit on load">
        <Switch
          checked={autofit}
          onCheckedChange={setAutofit}
          aria-label="Auto-fit"
        />
      </SettingRow>
    </SettingCard>
  )
}

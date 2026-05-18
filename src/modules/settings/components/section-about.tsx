import { RefreshCw } from 'lucide-react'

import { Button } from '@/shared/ui/button'

import { SettingCard } from './setting-card'
import { SettingRow } from './setting-row'

export function SectionAbout() {
  return (
    <SettingCard>
      <SettingRow label="Version">
        <span className="text-muted-foreground font-mono text-[12.5px] tabular-nums">
          0.1.0 · nightly
        </span>
      </SettingRow>
      <SettingRow label="Commit">
        <span className="text-muted-foreground font-mono text-[12.5px] tabular-nums">
          9832201
        </span>
      </SettingRow>
      <SettingRow label="Updates">
        <Button variant="outline" size="sm">
          <RefreshCw className="size-3.5" strokeWidth={1.7} />
          check
        </Button>
      </SettingRow>
    </SettingCard>
  )
}

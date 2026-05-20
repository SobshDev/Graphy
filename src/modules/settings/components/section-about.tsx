import { SettingCard } from './setting-card'
import { SettingRow } from './setting-row'

export function SectionAbout() {
  return (
    <SettingCard>
      <SettingRow label="Version">
        <span className="text-muted-foreground font-mono text-[12.5px] tabular-nums">
          {__APP_VERSION__}
        </span>
      </SettingRow>
      <SettingRow label="Commit">
        <span className="text-muted-foreground font-mono text-[12.5px] tabular-nums">
          {__APP_COMMIT__}
        </span>
      </SettingRow>
    </SettingCard>
  )
}

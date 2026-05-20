import { ThemeModeSelector } from './theme-mode-selector'
import { ThemePresetGrid } from './theme-preset-grid'

export function ThemesSection() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <h2 className="text-foreground text-[13px] font-medium tracking-tight">
          Appearance
        </h2>
        <ThemeModeSelector />
      </div>
      <div className="flex flex-col gap-2.5">
        <h2 className="text-foreground text-[13px] font-medium tracking-tight">
          Preset
        </h2>
        <ThemePresetGrid />
      </div>
    </div>
  )
}

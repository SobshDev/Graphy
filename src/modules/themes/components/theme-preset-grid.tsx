import { themePresets } from '../data/presets'
import { useThemeState } from '../hooks/use-theme'
import { resolveMode } from '../services/apply-theme'
import { themeStore } from '../state/theme-store'
import { ThemePresetCard } from './theme-preset-card'

export function ThemePresetGrid() {
  const state = useThemeState()
  const resolved = resolveMode(state.mode)

  return (
    <div className="grid grid-cols-2 gap-2">
      {themePresets.map((preset) => (
        <ThemePresetCard
          key={preset.id}
          preset={preset}
          mode={resolved}
          selected={state.preset === preset.id}
          onSelect={() => themeStore.setPreset(preset.id)}
        />
      ))}
    </div>
  )
}

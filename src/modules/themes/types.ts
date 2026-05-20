export type ThemeToken = {
  id: string
  cssVar: `--${string}`
  light: string
  dark: string
}

export type ThemePresetId = string

export type ResolvedMode = 'light' | 'dark'

export type ThemeMode = 'system' | ResolvedMode

export type ThemePresetValues = Partial<Record<string, string>>

export type ThemePreset = {
  id: ThemePresetId
  label: string
  blurb: string
  accent: Record<ResolvedMode, string>
  light: ThemePresetValues
  dark: ThemePresetValues
}

export type ThemeState = {
  preset: ThemePresetId
  mode: ThemeMode
}

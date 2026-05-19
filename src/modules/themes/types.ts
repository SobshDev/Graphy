export type ThemeToken = {
  id: string
  cssVar: `--${string}`
  defaultValue: string
}

export type ThemePresetId = string

export type ThemePreset = {
  id: ThemePresetId
  label: string
  blurb: string
  accent: string
  values: Partial<Record<string, string>>
}

export type ThemeState = {
  preset: ThemePresetId
}

export type ThemeTokenGroupId =
  | 'surface'
  | 'brand'
  | 'state'
  | 'chrome'
  | 'sidebar'
  | 'chart'
  | 'chat'
  | 'graph'
  | 'logo'

export type ThemeTokenGroup = {
  id: ThemeTokenGroupId
  label: string
  blurb: string
}

export type ThemeToken = {
  id: string
  cssVar: `--${string}`
  label: string
  description?: string
  group: ThemeTokenGroupId
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
  overrides: Partial<Record<string, string>>
}

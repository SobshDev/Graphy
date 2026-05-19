import { ThemesSection } from '@/modules/themes'

import { settingsSections } from '../data/sections'
import type { SettingsSectionId } from '../types'
import { SectionAbout } from './section-about'
import { SectionAi } from './section-ai'
import { SectionAppearance } from './section-appearance'
import { SectionKeybindings } from './section-keybindings'

type SettingsContentProps = {
  active: SettingsSectionId
}

function renderSection(active: SettingsSectionId) {
  switch (active) {
    case 'appearance':
      return <SectionAppearance />
    case 'themes':
      return <ThemesSection />
    case 'ai':
      return <SectionAi />
    case 'keybindings':
      return <SectionKeybindings />
    case 'about':
      return <SectionAbout />
  }
}

export function SettingsContent({ active }: SettingsContentProps) {
  const section = settingsSections.find((s) => s.id === active)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[640px] px-8 pb-16 pt-10">
        <h1 className="text-foreground mb-8 text-[20px] font-medium tracking-tight">
          {section?.label}
        </h1>
        <div className="rise">{renderSection(active)}</div>
      </div>
    </div>
  )
}

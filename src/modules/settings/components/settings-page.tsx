import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { settingsSections } from '../data/sections'
import type { SettingsSectionId } from '../types'
import { SettingsContent } from './settings-content'
import { SettingsNav } from './settings-nav'

const sectionIds = settingsSections.map((s) => s.id)

export function SettingsPage() {
  const navigate = useNavigate()
  const [active, setActive] = useState<SettingsSectionId>('appearance')

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          event.target.isContentEditable
        ) {
          return
        }
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        navigate({ to: '/' })
        return
      }
      if (event.key === ']' || event.key === '[') {
        event.preventDefault()
        const idx = sectionIds.indexOf(active)
        const next =
          event.key === ']'
            ? (idx + 1) % sectionIds.length
            : (idx - 1 + sectionIds.length) % sectionIds.length
        setActive(sectionIds[next])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, navigate])

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <SettingsNav active={active} onSelect={setActive} />
      <SettingsContent active={active} />
    </div>
  )
}

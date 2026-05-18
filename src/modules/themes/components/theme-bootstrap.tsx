import { useEffect } from 'react'

import { themeStore } from '../state/theme-store'

export function ThemeBootstrap() {
  useEffect(() => {
    themeStore.init()
  }, [])
  return null
}

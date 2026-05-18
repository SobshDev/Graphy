import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

type SettingCardProps = {
  children: ReactNode
  className?: string
}

export function SettingCard({ children, className }: SettingCardProps) {
  return (
    <div
      className={cn(
        'border-border bg-card/40 divide-border divide-y rounded-lg border',
        className,
      )}
    >
      {children}
    </div>
  )
}

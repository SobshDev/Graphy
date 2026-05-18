import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

type SettingRowProps = {
  label: string
  hint?: string
  align?: 'center' | 'start'
  className?: string
  children: ReactNode
}

export function SettingRow({
  label,
  hint,
  align = 'center',
  className,
  children,
}: SettingRowProps) {
  return (
    <div
      className={cn(
        'flex gap-6 px-4 py-3.5',
        align === 'start' ? 'items-start' : 'items-center',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-foreground text-[13px] tracking-tight">
          {label}
        </span>
        {hint ? (
          <span className="text-muted-foreground/80 text-[11.5px] leading-snug">
            {hint}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-end">{children}</div>
    </div>
  )
}

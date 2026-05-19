import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

type Side = 'left' | 'right'

type Options = {
  defaultWidth: number
  minWidth: number
  maxWidth: number
  side?: Side
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function usePanelResize({
  defaultWidth,
  minWidth,
  maxWidth,
  side = 'right',
}: Options) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const startRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const beginResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      event.preventDefault()
      startRef.current = { startX: event.clientX, startWidth: width }
      setIsResizing(true)
    },
    [width],
  )

  useEffect(() => {
    if (!isResizing) return

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect

    const handlePointerMove = (event: PointerEvent) => {
      const start = startRef.current
      if (!start) return
      const delta = event.clientX - start.startX
      const next =
        side === 'right' ? start.startWidth + delta : start.startWidth - delta
      setWidth(clamp(next, minWidth, maxWidth))
    }

    const stopResize = () => {
      startRef.current = null
      setIsResizing(false)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)

    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResize)
    }
  }, [isResizing, minWidth, maxWidth, side])

  return { width, minWidth, maxWidth, isResizing, beginResize }
}

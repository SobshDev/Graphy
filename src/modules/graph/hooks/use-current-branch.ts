import { useEffect, useState } from 'react'

import { getCurrentBranch } from '../services/git'

export function useCurrentBranch() {
  const [branch, setBranch] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCurrentBranch()
      .then((value) => {
        if (!cancelled) setBranch(value)
      })
      .catch(() => {
        if (!cancelled) setBranch(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return branch
}

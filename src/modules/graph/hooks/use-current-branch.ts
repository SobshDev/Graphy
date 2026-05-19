import { useEffect, useState } from 'react'

import { getCurrentBranch } from '../services/git'

export function useCurrentBranch(folder: string | null) {
  const [branch, setBranch] = useState<string | null>(null)

  useEffect(() => {
    if (!folder) {
      setBranch(null)
      return
    }

    let cancelled = false
    getCurrentBranch({ data: { folder } })
      .then((value) => {
        if (!cancelled) setBranch(value)
      })
      .catch(() => {
        if (!cancelled) setBranch(null)
      })
    return () => {
      cancelled = true
    }
  }, [folder])

  return branch
}

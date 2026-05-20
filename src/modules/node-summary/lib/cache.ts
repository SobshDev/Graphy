import { getDesktop } from '@/shared/lib/desktop'
import type { CachedSummary } from '@/shared/lib/desktop'

export async function readCachedSummary(
  nodeId: string,
): Promise<CachedSummary | null> {
  const desktop = getDesktop()
  if (!desktop) return null
  return await desktop.readNodeSummary(nodeId)
}

export async function writeCachedSummary(
  payload: CachedSummary,
): Promise<void> {
  const desktop = getDesktop()
  if (!desktop) return
  await desktop.writeNodeSummary(payload)
}

export function fingerprintMatches(
  a: CachedSummary['fingerprint'],
  b: CachedSummary['fingerprint'],
): boolean {
  if (a.sourceHash !== b.sourceHash) return false
  if (!arrayEquals(a.callerIds, b.callerIds)) return false
  if (!arrayEquals(a.calleeIds, b.calleeIds)) return false
  return true
}

function arrayEquals(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

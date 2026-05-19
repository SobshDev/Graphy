import type { CachedSummaryFingerprint, NodeSummaryRelation } from '../types'
import { sha256Hex } from './hash'

export async function computeFingerprint({
  source,
  callers,
  callees,
}: {
  source: string
  callers: NodeSummaryRelation[]
  callees: NodeSummaryRelation[]
}): Promise<CachedSummaryFingerprint> {
  return {
    sourceHash: await sha256Hex(source),
    callerIds: callers.map((c) => c.id).sort(),
    calleeIds: callees.map((c) => c.id).sort(),
  }
}

export function fingerprintMatches(
  a: CachedSummaryFingerprint,
  b: CachedSummaryFingerprint,
): boolean {
  if (a.sourceHash !== b.sourceHash) return false
  if (!arrayEq(a.callerIds, b.callerIds)) return false
  if (!arrayEq(a.calleeIds, b.calleeIds)) return false
  return true
}

function arrayEq(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

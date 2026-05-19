import { getDesktop } from '@/shared/lib/desktop'
import type { CachedSummary } from '@/shared/lib/desktop'

export async function readCachedSummary(
  nodeId: string,
): Promise<CachedSummary | null> {
  const desktop = getDesktop()
  if (!desktop?.readNodeSummary) return null
  return desktop.readNodeSummary(nodeId)
}

export async function writeCachedSummary(
  payload: CachedSummary,
): Promise<void> {
  const desktop = getDesktop()
  if (!desktop?.writeNodeSummary) return
  await desktop.writeNodeSummary(payload)
}

export async function deleteCachedSummary(nodeId: string): Promise<void> {
  const desktop = getDesktop()
  if (!desktop?.deleteNodeSummary) return
  await desktop.deleteNodeSummary(nodeId)
}

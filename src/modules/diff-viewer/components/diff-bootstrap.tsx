import { useRecomputeNodeStatus } from '../hooks/use-recompute-node-status'

export function DiffBootstrap() {
  useRecomputeNodeStatus()
  return null
}

export { ChangesSection } from './components/changes-section'
export { DiffView } from './components/diff-view'
export { OverlayToggles } from './components/overlay-toggles'

export { useDiffChanges } from './hooks/use-diff-changes'
export { useDiffOverlay } from './hooks/use-diff-overlay'

export {
  closeDiff,
  getOpenDiff,
  openDiff,
  useOpenDiff,
} from './state/open-diff'

export {
  getDiffOverlay,
  setDiffOverlayActive,
  setDiffOverlayLayer,
  subscribeDiffOverlay,
  toggleDiffOverlayLayer,
} from './state/diff-overlay'

export { diffToNodeStatus } from './lib/diff-to-node-status'
export { parseUnifiedDiff } from './lib/parse-unified-diff'

export type {
  ChangedFile,
  ChangedFileStatus,
  DiffLine,
  DiffLineKind,
  DiffOverlayState,
  DiffRow,
  DiffRowSide,
  Hunk,
  NodeDiffStatus,
} from './types'

export {
  getNodeStatusMap,
  setNodeStatusMap,
  subscribeNodeStatusMap,
  useNodeDiffStatus,
  useNodeStatusMap,
} from './state/node-status'
export { useRecomputeNodeStatus } from './hooks/use-recompute-node-status'
export { DiffBootstrap } from './components/diff-bootstrap'

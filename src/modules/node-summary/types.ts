export type NodeSummaryTarget = {
  file: string
  displayName: string
}

export type NodeSummaryDependency = {
  file: string
  displayName: string
}

export type SummaryStatus =
  | 'idle'
  | 'loading'
  | 'streaming'
  | 'ready'
  | 'no-key'
  | 'error'

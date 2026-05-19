import { createServerFn } from '@tanstack/react-start'

import { openRepo } from '@/shared/lib/git'

export type GitCommit = {
  hash: string
  shortHash: string
  subject: string
  body: string
  author: string
  email: string
  date: string
  refs: string
  isMerge: boolean
  pr: number | null
  graphLines: Array<{ raw: string; isCommit: boolean }>
}

export type GitHistory = {
  branch: string | null
  ahead: number
  behind: number
  tracking: string | null
  commits: Array<GitCommit>
}

export type GitBranches = {
  current: string | null
  local: Array<string>
  remote: Array<string>
}

const SEP = '␞'
const END = '␟'
const LOG_FORMAT = `%H${SEP}%P${SEP}%an${SEP}%ae${SEP}%aI${SEP}%D${SEP}%s${SEP}%b${END}`
const GRAPH_MARKER = '␜COMMIT_'

function parsePr(subject: string, body: string): number | null {
  const squash = subject.match(/\(#(\d+)\)\s*$/)
  if (squash) return Number(squash[1])
  const merge = subject.match(/^Merge pull request #(\d+)\b/)
  if (merge) return Number(merge[1])
  const bodyMatch = body.match(/^Merge pull request #(\d+)\b/)
  if (bodyMatch) return Number(bodyMatch[1])
  return null
}

type GraphEntry = {
  commitRow: string
  connectorRows: Array<string>
}

function parseGraphOutput(raw: string): Map<string, GraphEntry> {
  const lines = raw.split('\n')
  const graph = new Map<string, GraphEntry>()
  let currentHash: string | null = null

  for (const line of lines) {
    const markerIdx = line.indexOf(GRAPH_MARKER)
    if (markerIdx !== -1) {
      const prefix = line.slice(0, markerIdx)
      const hash = line.slice(markerIdx + GRAPH_MARKER.length).trim()
      currentHash = hash
      graph.set(hash, { commitRow: prefix, connectorRows: [] })
    } else if (line.trim() && currentHash) {
      graph.get(currentHash)?.connectorRows.push(line)
    }
  }

  return graph
}

export const getGitBranches = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => data as { folder: string })
  .handler(async ({ data }): Promise<GitBranches> => {
    try {
      const git = await openRepo(data.folder)
      const summary = await git.branch(['-a'])
      const local: Array<string> = []
      const remote: Array<string> = []
      for (const [name, info] of Object.entries(summary.branches)) {
        if (name.startsWith('remotes/')) {
          const short = name.replace(/^remotes\//, '')
          if (!short.includes('/HEAD')) remote.push(short)
        } else {
          if (!(info as { current?: boolean }).current) local.push(name)
        }
      }
      return {
        current: summary.current || null,
        local: local.sort(),
        remote: remote.sort(),
      }
    } catch {
      return { current: null, local: [], remote: [] }
    }
  })

export const getGitHistory = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: unknown) => data as { folder: string; branch?: string },
  )
  .handler(async ({ data }): Promise<GitHistory> => {
    try {
      const git = await openRepo(data.folder)
      const status = await git.status()
      const logTarget = data.branch ?? status.current ?? 'HEAD'

      const [commitRaw, graphRaw] = await Promise.all([
        git.raw([
          'log',
          '--max-count=200',
          `--pretty=format:${LOG_FORMAT}`,
          logTarget,
        ]),
        git.raw([
          'log',
          '--graph',
          '--max-count=200',
          `--format=${GRAPH_MARKER}%H`,
          logTarget,
        ]),
      ])

      const graphMap = parseGraphOutput(graphRaw)

      const commits: Array<GitCommit> = commitRaw
        .split(END)
        .filter((s) => s.trim())
        .map((entry) => {
          const p = entry.trim().split(SEP)
          const hash = p[0] ?? ''
          const parents = (p[1] ?? '').trim().split(' ').filter(Boolean)
          const subject = p[6] ?? ''
          const body = (p[7] ?? '').trim()
          const g = graphMap.get(hash)
          const graphLines: Array<{ raw: string; isCommit: boolean }> = []
          if (g) {
            graphLines.push({ raw: g.commitRow, isCommit: true })
            for (const row of g.connectorRows) {
              graphLines.push({ raw: row, isCommit: false })
            }
          }
          return {
            hash,
            shortHash: hash.slice(0, 7),
            author: p[2] ?? '',
            email: p[3] ?? '',
            date: p[4] ?? '',
            refs: p[5] ?? '',
            subject,
            body,
            isMerge: parents.length > 1,
            pr: parsePr(subject, body),
            graphLines,
          }
        })

      return {
        branch: data.branch ?? status.current,
        ahead: status.ahead,
        behind: status.behind,
        tracking: status.tracking,
        commits,
      }
    } catch {
      return {
        branch: null,
        ahead: 0,
        behind: 0,
        tracking: null,
        commits: [],
      }
    }
  })

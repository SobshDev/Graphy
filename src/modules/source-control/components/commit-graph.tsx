const COL_W = 10
const RADIUS = 3
const DOT_Y = 16
const BIG_Y = 4000

const LANE_COLORS = [
  'var(--color-primary)',
  '#22d3ee',
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#fbbf24',
  '#fb923c',
  '#60a5fa',
]

function laneColor(col: number): string {
  return LANE_COLORS[col % LANE_COLORS.length]
}

function colX(col: number): number {
  return col * COL_W + COL_W / 2
}

function renderCommitLine(raw: string): Array<React.ReactNode> {
  const nodes: Array<React.ReactNode> = []

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    const col = Math.floor(i / 2)
    const isNode = i % 2 === 0

    if (isNode) {
      if (ch === '|') {
        nodes.push(
          <line
            key={i}
            x1={colX(col)}
            y1={0}
            x2={colX(col)}
            y2={BIG_Y}
            stroke={laneColor(col)}
            strokeWidth={1.5}
          />,
        )
      } else if (ch === '*') {
        nodes.push(
          <line
            key={`${i}t`}
            x1={colX(col)}
            y1={0}
            x2={colX(col)}
            y2={DOT_Y - RADIUS}
            stroke={laneColor(col)}
            strokeWidth={1.5}
          />,
          <circle
            key={i}
            cx={colX(col)}
            cy={DOT_Y}
            r={RADIUS}
            fill={laneColor(col)}
          />,
          <line
            key={`${i}b`}
            x1={colX(col)}
            y1={DOT_Y + RADIUS}
            x2={colX(col)}
            y2={BIG_Y}
            stroke={laneColor(col)}
            strokeWidth={1.5}
          />,
        )
      }
    } else {
      const L = col
      const R = col + 1
      if (ch === '-' || ch === '_') {
        nodes.push(
          <line
            key={i}
            x1={colX(L)}
            y1={DOT_Y}
            x2={colX(R)}
            y2={DOT_Y}
            stroke={laneColor(R)}
            strokeWidth={1.5}
          />,
        )
      }
    }
  }

  return nodes
}

function renderConnectorLine(raw: string, h: number): Array<React.ReactNode> {
  const nodes: Array<React.ReactNode> = []

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    const col = Math.floor(i / 2)
    const isNode = i % 2 === 0

    if (isNode) {
      if (ch === '|') {
        nodes.push(
          <line
            key={i}
            x1={colX(col)}
            y1={0}
            x2={colX(col)}
            y2={h}
            stroke={laneColor(col)}
            strokeWidth={1.5}
          />,
        )
      }
    } else {
      const L = col
      const R = col + 1
      if (ch === '\\') {
        nodes.push(
          <line
            key={i}
            x1={colX(L)}
            y1={0}
            x2={colX(R)}
            y2={h}
            stroke={laneColor(R)}
            strokeWidth={1.5}
          />,
        )
      } else if (ch === '/') {
        nodes.push(
          <line
            key={i}
            x1={colX(R)}
            y1={0}
            x2={colX(L)}
            y2={h}
            stroke={laneColor(R)}
            strokeWidth={1.5}
          />,
        )
      } else if (ch === '-' || ch === '_') {
        nodes.push(
          <line
            key={i}
            x1={colX(L)}
            y1={h / 2}
            x2={colX(R)}
            y2={h / 2}
            stroke={laneColor(R)}
            strokeWidth={1.5}
          />,
        )
      }
    }
  }

  return nodes
}

export function GraphCommitLine({
  raw,
  graphWidth,
}: {
  raw: string
  graphWidth: number
}) {
  const width = graphWidth * COL_W

  return (
    <svg width={width} height={DOT_Y * 2} className="h-full shrink-0">
      {renderCommitLine(raw)}
    </svg>
  )
}

export function GraphConnectorLine({
  raw,
  height,
  graphWidth,
}: {
  raw: string
  height: number
  graphWidth: number
}) {
  const width = graphWidth * COL_W

  return (
    <svg width={width} height={height} className="shrink-0">
      {renderConnectorLine(raw, height)}
    </svg>
  )
}

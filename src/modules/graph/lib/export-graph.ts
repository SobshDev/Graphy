import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import { toPng, toSvg } from 'html-to-image'

export type ExportFormat = 'png' | 'svg'

const PADDING = 48
const PIXEL_RATIO = 2

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.setAttribute('href', dataUrl)
  link.setAttribute('download', filename)
  link.click()
}

function readCanvasBackground(): string {
  const canvas = document.querySelector<HTMLElement>('.react-flow')
  if (!canvas) return '#0a0a0a'
  const color = getComputedStyle(canvas).backgroundColor
  return color && color !== 'rgba(0, 0, 0, 0)' ? color : '#0a0a0a'
}

export async function exportGraphImage(
  nodes: Node[],
  format: ExportFormat,
  filename: string,
) {
  const viewport = document.querySelector<HTMLElement>('.react-flow__viewport')
  if (!viewport || nodes.length === 0) return

  const bounds = getNodesBounds(nodes)
  const width = Math.max(1, Math.round(bounds.width + PADDING * 2))
  const height = Math.max(1, Math.round(bounds.height + PADDING * 2))
  const transform = getViewportForBounds(bounds, width, height, 1, 1, 0.1)

  const options = {
    backgroundColor: readCanvasBackground(),
    width,
    height,
    pixelRatio: PIXEL_RATIO,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
    },
  }

  const dataUrl =
    format === 'png'
      ? await toPng(viewport, options)
      : await toSvg(viewport, options)

  downloadDataUrl(dataUrl, filename)
}

import type { ThemeTokenGroup } from '../types'

export const themeTokenGroups: Array<ThemeTokenGroup> = [
  { id: 'surface', label: 'Surfaces', blurb: 'Backgrounds, cards, popovers' },
  { id: 'brand', label: 'Brand', blurb: 'Primary accent color' },
  {
    id: 'state',
    label: 'States',
    blurb: 'Destructive and other status colors',
  },
  { id: 'chrome', label: 'Chrome', blurb: 'Borders, inputs, focus rings' },
  { id: 'sidebar', label: 'Sidebar', blurb: 'Left navigation surfaces' },
  { id: 'chart', label: 'Charts', blurb: 'Data-viz color ramp' },
  { id: 'chat', label: 'AI Chat', blurb: 'Chat panel surfaces and text' },
  { id: 'graph', label: 'Graph', blurb: 'Nodes, edges, background grid' },
  { id: 'logo', label: 'Logos', blurb: 'Brand mark colors' },
]

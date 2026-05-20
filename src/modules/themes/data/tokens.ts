import type { ResolvedMode, ThemeToken } from '../types'

export const themeTokens: Array<ThemeToken> = [
  // Surfaces
  {
    id: 'background',
    cssVar: '--background',
    dark: 'oklch(0.145 0 0)',
    light: 'oklch(0.985 0 0)',
  },
  {
    id: 'foreground',
    cssVar: '--foreground',
    dark: 'oklch(0.985 0 0)',
    light: 'oklch(0.18 0 0)',
  },
  {
    id: 'card',
    cssVar: '--card',
    dark: 'oklch(0.205 0 0)',
    light: 'oklch(0.96 0 0)',
  },
  {
    id: 'card-foreground',
    cssVar: '--card-foreground',
    dark: 'oklch(0.985 0 0)',
    light: 'oklch(0.18 0 0)',
  },
  {
    id: 'popover',
    cssVar: '--popover',
    dark: 'oklch(0.205 0 0)',
    light: 'oklch(0.985 0 0)',
  },
  {
    id: 'popover-foreground',
    cssVar: '--popover-foreground',
    dark: 'oklch(0.985 0 0)',
    light: 'oklch(0.18 0 0)',
  },
  {
    id: 'muted',
    cssVar: '--muted',
    dark: 'oklch(0.269 0 0)',
    light: 'oklch(0.92 0 0)',
  },
  {
    id: 'muted-foreground',
    cssVar: '--muted-foreground',
    dark: 'oklch(0.708 0 0)',
    light: 'oklch(0.45 0 0)',
  },
  {
    id: 'accent',
    cssVar: '--accent',
    dark: 'oklch(0.269 0 0)',
    light: 'oklch(0.92 0 0)',
  },
  {
    id: 'accent-foreground',
    cssVar: '--accent-foreground',
    dark: 'oklch(0.985 0 0)',
    light: 'oklch(0.18 0 0)',
  },
  {
    id: 'secondary',
    cssVar: '--secondary',
    dark: 'oklch(0.274 0.006 286.033)',
    light: 'oklch(0.93 0.005 280)',
  },
  {
    id: 'secondary-foreground',
    cssVar: '--secondary-foreground',
    dark: 'oklch(0.985 0 0)',
    light: 'oklch(0.18 0 0)',
  },
  {
    id: 'canvas',
    cssVar: '--canvas',
    dark: 'oklch(0.16 0 0)',
    light: 'oklch(0.91 0 0)',
  },

  // Brand
  {
    id: 'primary',
    cssVar: '--primary',
    dark: 'oklch(0.9 0.26 122)',
    light: 'oklch(0.9 0.26 122)',
  },
  {
    id: 'primary-foreground',
    cssVar: '--primary-foreground',
    dark: 'oklch(0.3 0.1 122)',
    light: 'oklch(0.3 0.1 122)',
  },

  // State
  {
    id: 'destructive',
    cssVar: '--destructive',
    dark: 'oklch(0.704 0.191 22.216)',
    light: 'oklch(0.6 0.22 22)',
  },

  // Chrome
  {
    id: 'border',
    cssVar: '--border',
    dark: 'oklch(1 0 0 / 10%)',
    light: 'oklch(0 0 0 / 12%)',
  },
  {
    id: 'input',
    cssVar: '--input',
    dark: 'oklch(1 0 0 / 15%)',
    light: 'oklch(0 0 0 / 18%)',
  },
  {
    id: 'ring',
    cssVar: '--ring',
    dark: 'oklch(0.556 0 0)',
    light: 'oklch(0.5 0 0)',
  },

  // Sidebar
  {
    id: 'sidebar',
    cssVar: '--sidebar',
    dark: 'oklch(0.205 0 0)',
    light: 'oklch(0.96 0 0)',
  },
  {
    id: 'sidebar-foreground',
    cssVar: '--sidebar-foreground',
    dark: 'oklch(0.985 0 0)',
    light: 'oklch(0.18 0 0)',
  },
  {
    id: 'sidebar-primary',
    cssVar: '--sidebar-primary',
    dark: 'oklch(0.9 0.26 122)',
    light: 'oklch(0.9 0.26 122)',
  },
  {
    id: 'sidebar-primary-foreground',
    cssVar: '--sidebar-primary-foreground',
    dark: 'oklch(0.28 0.085 122)',
    light: 'oklch(0.28 0.085 122)',
  },
  {
    id: 'sidebar-accent',
    cssVar: '--sidebar-accent',
    dark: 'oklch(0.269 0 0)',
    light: 'oklch(0.92 0 0)',
  },
  {
    id: 'sidebar-accent-foreground',
    cssVar: '--sidebar-accent-foreground',
    dark: 'oklch(0.985 0 0)',
    light: 'oklch(0.18 0 0)',
  },
  {
    id: 'sidebar-border',
    cssVar: '--sidebar-border',
    dark: 'oklch(1 0 0 / 10%)',
    light: 'oklch(0 0 0 / 12%)',
  },
  {
    id: 'sidebar-ring',
    cssVar: '--sidebar-ring',
    dark: 'oklch(0.556 0 0)',
    light: 'oklch(0.5 0 0)',
  },

  // Chart
  {
    id: 'chart-1',
    cssVar: '--chart-1',
    dark: 'oklch(0.94 0.23 120)',
    light: 'oklch(0.94 0.23 120)',
  },
  {
    id: 'chart-2',
    cssVar: '--chart-2',
    dark: 'oklch(0.9 0.26 122)',
    light: 'oklch(0.9 0.26 122)',
  },
  {
    id: 'chart-3',
    cssVar: '--chart-3',
    dark: 'oklch(0.78 0.24 125)',
    light: 'oklch(0.78 0.24 125)',
  },
  {
    id: 'chart-4',
    cssVar: '--chart-4',
    dark: 'oklch(0.62 0.18 128)',
    light: 'oklch(0.62 0.18 128)',
  },
  {
    id: 'chart-5',
    cssVar: '--chart-5',
    dark: 'oklch(0.5 0.13 130)',
    light: 'oklch(0.5 0.13 130)',
  },

  // Chat
  {
    id: 'chat-bg',
    cssVar: '--chat-bg',
    dark: 'oklch(0.205 0 0)',
    light: 'oklch(0.96 0 0)',
  },
  {
    id: 'chat-elev',
    cssVar: '--chat-elev',
    dark: 'oklch(0.255 0 0)',
    light: 'oklch(0.92 0 0)',
  },
  {
    id: 'chat-hover',
    cssVar: '--chat-hover',
    dark: 'oklch(0.295 0 0)',
    light: 'oklch(0.89 0 0)',
  },
  {
    id: 'chat-sunken',
    cssVar: '--chat-sunken',
    dark: 'oklch(0.17 0 0)',
    light: 'oklch(0.985 0 0)',
  },
  {
    id: 'chat-bubble',
    cssVar: '--chat-bubble',
    dark: 'oklch(0.245 0 0)',
    light: 'oklch(0.92 0 0)',
  },
  {
    id: 'chat-line',
    cssVar: '--chat-line',
    dark: 'rgba(255, 255, 255, 0.07)',
    light: 'rgba(0, 0, 0, 0.08)',
  },
  {
    id: 'chat-line-strong',
    cssVar: '--chat-line-strong',
    dark: 'rgba(255, 255, 255, 0.12)',
    light: 'rgba(0, 0, 0, 0.14)',
  },
  {
    id: 'chat-text',
    cssVar: '--chat-text',
    dark: '#f5f5f5',
    light: '#171717',
  },
  {
    id: 'chat-text-2',
    cssVar: '--chat-text-2',
    dark: '#a3a3a3',
    light: '#4a4a4a',
  },
  {
    id: 'chat-text-3',
    cssVar: '--chat-text-3',
    dark: '#6e6e6e',
    light: '#808080',
  },
  {
    id: 'chat-text-4',
    cssVar: '--chat-text-4',
    dark: '#454545',
    light: '#bdbdbd',
  },
  {
    id: 'chat-accent',
    cssVar: '--chat-accent',
    dark: '#c8ccd2',
    light: '#1f2937',
  },
  {
    id: 'chat-accent-2',
    cssVar: '--chat-accent-2',
    dark: '#dde0e5',
    light: '#374151',
  },
  {
    id: 'chat-accent-rail',
    cssVar: '--chat-accent-rail',
    dark: 'rgba(200, 204, 210, 0.5)',
    light: 'rgba(31, 41, 55, 0.5)',
  },
  {
    id: 'chat-accent-soft',
    cssVar: '--chat-accent-soft',
    dark: 'rgba(200, 204, 210, 0.08)',
    light: 'rgba(31, 41, 55, 0.08)',
  },
  {
    id: 'chat-accent-fg',
    cssVar: '--chat-accent-fg',
    dark: '#0a0d04',
    light: '#ffffff',
  },
  {
    id: 'chat-danger',
    cssVar: '--chat-danger',
    dark: '#ff6868',
    light: '#dc2626',
  },
  {
    id: 'chat-danger-border',
    cssVar: '--chat-danger-border',
    dark: 'rgba(255, 104, 104, 0.4)',
    light: 'rgba(220, 38, 38, 0.4)',
  },
  {
    id: 'chat-scrollbar',
    cssVar: '--chat-scrollbar',
    dark: 'rgba(255, 255, 255, 0.06)',
    light: 'rgba(0, 0, 0, 0.08)',
  },
  {
    id: 'chat-scrollbar-hover',
    cssVar: '--chat-scrollbar-hover',
    dark: 'rgba(255, 255, 255, 0.12)',
    light: 'rgba(0, 0, 0, 0.16)',
  },

  // Graph
  {
    id: 'graph-dot',
    cssVar: '--graph-dot',
    dark: '#2a2f37',
    light: '#c8ccd2',
  },
  {
    id: 'node-class',
    cssVar: '--node-class',
    dark: 'oklch(0.79 0.16 75)',
    light: 'oklch(0.79 0.16 75)',
  },
  {
    id: 'node-class-fg',
    cssVar: '--node-class-fg',
    dark: 'oklch(0.7 0.16 65)',
    light: 'oklch(0.7 0.16 65)',
  },
  {
    id: 'node-method',
    cssVar: '--node-method',
    dark: 'oklch(0.62 0.22 295)',
    light: 'oklch(0.62 0.22 295)',
  },
  {
    id: 'node-accessor',
    cssVar: '--node-accessor',
    dark: 'oklch(0.7 0.12 195)',
    light: 'oklch(0.7 0.12 195)',
  },
  {
    id: 'node-arrow',
    cssVar: '--node-arrow',
    dark: 'oklch(0.72 0.15 230)',
    light: 'oklch(0.72 0.15 230)',
  },

  // Logo
  {
    id: 'brand-claude',
    cssVar: '--brand-claude',
    dark: '#d97757',
    light: '#d97757',
  },

  // Code editor syntax
  {
    id: 'syntax-keyword',
    cssVar: '--syntax-keyword',
    dark: '#c678dd',
    light: '#a626a4',
  },
  {
    id: 'syntax-string',
    cssVar: '--syntax-string',
    dark: '#98c379',
    light: '#50a14f',
  },
  {
    id: 'syntax-number',
    cssVar: '--syntax-number',
    dark: '#d19a66',
    light: '#986801',
  },
  {
    id: 'syntax-comment',
    cssVar: '--syntax-comment',
    dark: '#7d8799',
    light: '#a0a1a7',
  },
  {
    id: 'syntax-function',
    cssVar: '--syntax-function',
    dark: '#61afef',
    light: '#4078f2',
  },
  {
    id: 'syntax-variable',
    cssVar: '--syntax-variable',
    dark: '#e06c75',
    light: '#e45649',
  },
  {
    id: 'syntax-type',
    cssVar: '--syntax-type',
    dark: '#e5c07b',
    light: '#c18401',
  },
  {
    id: 'syntax-property',
    cssVar: '--syntax-property',
    dark: '#56b6c2',
    light: '#0184bc',
  },
  {
    id: 'syntax-tag',
    cssVar: '--syntax-tag',
    dark: '#e06c75',
    light: '#e45649',
  },
  {
    id: 'syntax-attribute',
    cssVar: '--syntax-attribute',
    dark: '#d19a66',
    light: '#986801',
  },
  {
    id: 'syntax-operator',
    cssVar: '--syntax-operator',
    dark: '#56b6c2',
    light: '#0184bc',
  },
  {
    id: 'syntax-regex',
    cssVar: '--syntax-regex',
    dark: '#98c379',
    light: '#50a14f',
  },
  {
    id: 'syntax-meta',
    cssVar: '--syntax-meta',
    dark: '#7d8799',
    light: '#a0a1a7',
  },
  {
    id: 'syntax-link',
    cssVar: '--syntax-link',
    dark: '#61afef',
    light: '#4078f2',
  },
]

export const themeTokenById = new Map(themeTokens.map((t) => [t.id, t]))

export function tokenDefault(id: string, mode: ResolvedMode): string {
  return themeTokenById.get(id)?.[mode] ?? ''
}

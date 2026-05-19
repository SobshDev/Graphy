import type { ThemeToken } from '../types'

export const themeTokens: Array<ThemeToken> = [
  // Surfaces
  {
    id: 'background',
    cssVar: '--background',
    defaultValue: 'oklch(0.145 0 0)',
  },
  {
    id: 'foreground',
    cssVar: '--foreground',
    defaultValue: 'oklch(0.985 0 0)',
  },
  { id: 'card', cssVar: '--card', defaultValue: 'oklch(0.205 0 0)' },
  {
    id: 'card-foreground',
    cssVar: '--card-foreground',
    defaultValue: 'oklch(0.985 0 0)',
  },
  { id: 'popover', cssVar: '--popover', defaultValue: 'oklch(0.205 0 0)' },
  {
    id: 'popover-foreground',
    cssVar: '--popover-foreground',
    defaultValue: 'oklch(0.985 0 0)',
  },
  { id: 'muted', cssVar: '--muted', defaultValue: 'oklch(0.269 0 0)' },
  {
    id: 'muted-foreground',
    cssVar: '--muted-foreground',
    defaultValue: 'oklch(0.708 0 0)',
  },
  { id: 'accent', cssVar: '--accent', defaultValue: 'oklch(0.269 0 0)' },
  {
    id: 'accent-foreground',
    cssVar: '--accent-foreground',
    defaultValue: 'oklch(0.985 0 0)',
  },
  {
    id: 'secondary',
    cssVar: '--secondary',
    defaultValue: 'oklch(0.274 0.006 286.033)',
  },
  {
    id: 'secondary-foreground',
    cssVar: '--secondary-foreground',
    defaultValue: 'oklch(0.985 0 0)',
  },
  { id: 'canvas', cssVar: '--canvas', defaultValue: 'oklch(0.16 0 0)' },

  // Brand
  { id: 'primary', cssVar: '--primary', defaultValue: 'oklch(0.9 0.26 122)' },
  {
    id: 'primary-foreground',
    cssVar: '--primary-foreground',
    defaultValue: 'oklch(0.3 0.1 122)',
  },

  // State
  {
    id: 'destructive',
    cssVar: '--destructive',
    defaultValue: 'oklch(0.704 0.191 22.216)',
  },

  // Chrome
  { id: 'border', cssVar: '--border', defaultValue: 'oklch(1 0 0 / 10%)' },
  { id: 'input', cssVar: '--input', defaultValue: 'oklch(1 0 0 / 15%)' },
  { id: 'ring', cssVar: '--ring', defaultValue: 'oklch(0.556 0 0)' },

  // Sidebar
  { id: 'sidebar', cssVar: '--sidebar', defaultValue: 'oklch(0.205 0 0)' },
  {
    id: 'sidebar-foreground',
    cssVar: '--sidebar-foreground',
    defaultValue: 'oklch(0.985 0 0)',
  },
  {
    id: 'sidebar-primary',
    cssVar: '--sidebar-primary',
    defaultValue: 'oklch(0.9 0.26 122)',
  },
  {
    id: 'sidebar-primary-foreground',
    cssVar: '--sidebar-primary-foreground',
    defaultValue: 'oklch(0.28 0.085 122)',
  },
  {
    id: 'sidebar-accent',
    cssVar: '--sidebar-accent',
    defaultValue: 'oklch(0.269 0 0)',
  },
  {
    id: 'sidebar-accent-foreground',
    cssVar: '--sidebar-accent-foreground',
    defaultValue: 'oklch(0.985 0 0)',
  },
  {
    id: 'sidebar-border',
    cssVar: '--sidebar-border',
    defaultValue: 'oklch(1 0 0 / 10%)',
  },
  {
    id: 'sidebar-ring',
    cssVar: '--sidebar-ring',
    defaultValue: 'oklch(0.556 0 0)',
  },

  // Chart
  { id: 'chart-1', cssVar: '--chart-1', defaultValue: 'oklch(0.94 0.23 120)' },
  { id: 'chart-2', cssVar: '--chart-2', defaultValue: 'oklch(0.9 0.26 122)' },
  { id: 'chart-3', cssVar: '--chart-3', defaultValue: 'oklch(0.78 0.24 125)' },
  { id: 'chart-4', cssVar: '--chart-4', defaultValue: 'oklch(0.62 0.18 128)' },
  { id: 'chart-5', cssVar: '--chart-5', defaultValue: 'oklch(0.5 0.13 130)' },

  // Chat
  { id: 'chat-bg', cssVar: '--chat-bg', defaultValue: 'oklch(0.205 0 0)' },
  { id: 'chat-elev', cssVar: '--chat-elev', defaultValue: 'oklch(0.255 0 0)' },
  {
    id: 'chat-hover',
    cssVar: '--chat-hover',
    defaultValue: 'oklch(0.295 0 0)',
  },
  {
    id: 'chat-sunken',
    cssVar: '--chat-sunken',
    defaultValue: 'oklch(0.17 0 0)',
  },
  {
    id: 'chat-bubble',
    cssVar: '--chat-bubble',
    defaultValue: 'oklch(0.245 0 0)',
  },
  {
    id: 'chat-line',
    cssVar: '--chat-line',
    defaultValue: 'rgba(255, 255, 255, 0.07)',
  },
  {
    id: 'chat-line-strong',
    cssVar: '--chat-line-strong',
    defaultValue: 'rgba(255, 255, 255, 0.12)',
  },
  { id: 'chat-text', cssVar: '--chat-text', defaultValue: '#f5f5f5' },
  { id: 'chat-text-2', cssVar: '--chat-text-2', defaultValue: '#a3a3a3' },
  { id: 'chat-text-3', cssVar: '--chat-text-3', defaultValue: '#6e6e6e' },
  { id: 'chat-text-4', cssVar: '--chat-text-4', defaultValue: '#454545' },
  { id: 'chat-accent', cssVar: '--chat-accent', defaultValue: '#c8ccd2' },
  { id: 'chat-accent-2', cssVar: '--chat-accent-2', defaultValue: '#dde0e5' },
  {
    id: 'chat-accent-rail',
    cssVar: '--chat-accent-rail',
    defaultValue: 'rgba(200, 204, 210, 0.5)',
  },
  {
    id: 'chat-accent-soft',
    cssVar: '--chat-accent-soft',
    defaultValue: 'rgba(200, 204, 210, 0.08)',
  },
  { id: 'chat-accent-fg', cssVar: '--chat-accent-fg', defaultValue: '#0a0d04' },
  { id: 'chat-danger', cssVar: '--chat-danger', defaultValue: '#ff6868' },
  {
    id: 'chat-danger-border',
    cssVar: '--chat-danger-border',
    defaultValue: 'rgba(255, 104, 104, 0.4)',
  },
  {
    id: 'chat-scrollbar',
    cssVar: '--chat-scrollbar',
    defaultValue: 'rgba(255, 255, 255, 0.06)',
  },
  {
    id: 'chat-scrollbar-hover',
    cssVar: '--chat-scrollbar-hover',
    defaultValue: 'rgba(255, 255, 255, 0.12)',
  },

  // Graph
  { id: 'graph-dot', cssVar: '--graph-dot', defaultValue: '#2a2f37' },
  {
    id: 'node-class',
    cssVar: '--node-class',
    defaultValue: 'oklch(0.79 0.16 75)',
  },
  {
    id: 'node-class-fg',
    cssVar: '--node-class-fg',
    defaultValue: 'oklch(0.7 0.16 65)',
  },
  {
    id: 'node-method',
    cssVar: '--node-method',
    defaultValue: 'oklch(0.62 0.22 295)',
  },
  {
    id: 'node-accessor',
    cssVar: '--node-accessor',
    defaultValue: 'oklch(0.7 0.12 195)',
  },
  {
    id: 'node-arrow',
    cssVar: '--node-arrow',
    defaultValue: 'oklch(0.72 0.15 230)',
  },

  // Logo
  { id: 'brand-claude', cssVar: '--brand-claude', defaultValue: '#d97757' },
]

export const themeTokenById = new Map(themeTokens.map((t) => [t.id, t]))

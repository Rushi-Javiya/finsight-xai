import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import type { AssetClass } from '../../api/types'

Chart.register(ArcElement, BarElement, CategoryScale, Filler, LinearScale, LineElement, PointElement, Tooltip)

export const palette = {
  text: '#e6ecf5',
  muted: '#93a1b8',
  grid: 'rgba(147, 161, 184, 0.14)',
  zeroLine: 'rgba(230, 236, 245, 0.45)',
  surface: '#111a2e',
  accent: '#6ea8fe',
  positive: '#34d399',
  negative: '#f87171',
  neutral: '#64748b',
  categorical: [
    '#6ea8fe',
    '#34d399',
    '#fbbf24',
    '#c084fc',
    '#f472b6',
    '#22d3ee',
    '#fb923c',
    '#a3e635',
    '#818cf8',
    '#94a3b8',
  ],
} as const

export const assetClassColors: Record<AssetClass, string> = {
  STOCKS: '#6ea8fe',
  ETFS: '#34d399',
  BONDS: '#fbbf24',
  CASH: '#94a3b8',
}

export const categoricalColor = (index: number): string =>
  palette.categorical[index % palette.categorical.length] ?? palette.accent

Chart.defaults.color = palette.muted
Chart.defaults.borderColor = palette.grid
Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
Chart.defaults.font.size = 12
Chart.defaults.plugins.tooltip.backgroundColor = '#0b1220'
Chart.defaults.plugins.tooltip.borderColor = '#2b3b57'
Chart.defaults.plugins.tooltip.borderWidth = 1
Chart.defaults.plugins.tooltip.titleColor = palette.text
Chart.defaults.plugins.tooltip.bodyColor = palette.text
Chart.defaults.plugins.tooltip.padding = 10

export function hatchedFill(color: string): string | CanvasPattern {
  const canvas = document.createElement('canvas')
  canvas.width = 8
  canvas.height = 8
  const context = canvas.getContext('2d')
  if (!context) return color
  context.fillStyle = 'rgba(100, 116, 139, 0.18)'
  context.fillRect(0, 0, 8, 8)
  context.strokeStyle = color
  context.lineWidth = 1.5
  context.beginPath()
  context.moveTo(-2, 10)
  context.lineTo(10, -2)
  context.stroke()
  return context.createPattern(canvas, 'repeat') ?? color
}

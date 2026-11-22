import type { ChartOptions } from 'chart.js'
import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { hatchedFill, palette } from './theme'

export interface BarItem {
  label: string
  value: number
  muted?: boolean
  tooltip?: string[]
}

interface Props {
  items: BarItem[]
  ariaLabel: string
  formatValue: (value: number) => string
}

const ROW_HEIGHT = 34
const AXIS_HEIGHT = 40

export function BarsChart({ items, ariaLabel, formatValue }: Props) {
  const colors = useMemo(
    () =>
      items.map((item) => {
        const color = item.value >= 0 ? palette.positive : palette.negative
        return item.muted ? hatchedFill(palette.neutral) : color
      }),
    [items],
  )

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (entries) => entries[0]?.label ?? '',
          label: (entry) => items[entry.dataIndex]?.tooltip ?? [formatValue(Number(entry.raw))],
        },
      },
    },
    scales: {
      x: {
        grid: { color: (ctx) => (ctx.tick.value === 0 ? palette.zeroLine : palette.grid) },
        ticks: { callback: (value) => formatValue(Number(value)), maxTicksLimit: 6 },
      },
      y: { grid: { display: false }, ticks: { color: palette.text } },
    },
  }

  return (
    <div className="chart-frame" style={{ height: items.length * ROW_HEIGHT + AXIS_HEIGHT }}>
      <Bar
        aria-label={ariaLabel}
        role="img"
        options={options}
        data={{
          labels: items.map((item) => item.label),
          datasets: [
            {
              data: items.map((item) => item.value),
              backgroundColor: colors,
              borderColor: items.map((item) => (item.muted ? palette.neutral : 'transparent')),
              borderWidth: items.map((item) => (item.muted ? 1 : 0)),
              borderRadius: 3,
              barThickness: 18,
            },
          ],
        }}
      />
    </div>
  )
}

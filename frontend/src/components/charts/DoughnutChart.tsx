import type { ChartOptions } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { palette } from './theme'

interface Props {
  labels: string[]
  values: number[]
  colors: string[]
  ariaLabel: string
  formatValue: (value: number) => string
  height?: number
}

export function DoughnutChart({ labels, values, colors, ariaLabel, formatValue, height = 220 }: Props) {
  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '64%',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (item) => ` ${item.label}: ${formatValue(Number(item.raw))}` } },
    },
  }
  return (
    <div className="chart-frame" style={{ height }}>
      <Doughnut
        aria-label={ariaLabel}
        role="img"
        options={options}
        data={{
          labels,
          datasets: [{ data: values, backgroundColor: colors, borderColor: palette.surface, borderWidth: 2, hoverOffset: 4 }],
        }}
      />
    </div>
  )
}

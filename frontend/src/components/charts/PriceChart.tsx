import type { ChartOptions } from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { PricePoint } from '../../api/types'
import { formatCurrency, formatShortDate } from '../../lib/format'
import { palette } from './theme'

interface Props {
  points: PricePoint[]
  currency: string
  ticker: string
}

export function PriceChart({ points, currency, ticker }: Props) {
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (entry) => ` ${formatCurrency(Number(entry.raw), currency, 2)}` } },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxTicksLimit: 5,
          maxRotation: 0,
          callback: (value) => {
            const point = points[Number(value)]
            return point ? formatShortDate(point.date) : ''
          },
        },
      },
      y: { grid: { color: palette.grid }, ticks: { callback: (value) => formatCurrency(Number(value), currency) } },
    },
  }

  return (
    <div className="chart-frame" style={{ height: 200 }}>
      <Line
        aria-label={`Six-month closing price chart for ${ticker}`}
        role="img"
        options={options}
        data={{
          labels: points.map((point) => point.date),
          datasets: [
            {
              data: points.map((point) => point.close),
              borderColor: palette.accent,
              backgroundColor: 'rgba(110, 168, 254, 0.12)',
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              tension: 0.2,
              fill: true,
            },
          ],
        }}
      />
    </div>
  )
}

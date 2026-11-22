import type { ChartOptions } from 'chart.js'
import { Scatter } from 'react-chartjs-2'
import type { Holding } from '../../api/types'
import { formatPercent, formatSignedPercent } from '../../lib/format'
import { palette } from './theme'

interface Props {
  holdings: Holding[]
}

export function RiskReturnChart({ holdings }: Props) {
  const options: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (entries) => holdings[entries[0]?.dataIndex ?? 0]?.ticker ?? '',
          label: (entry) => {
            const holding = holdings[entry.dataIndex]
            if (!holding) return ''
            return [
              `${holding.name}`,
              `Volatility: ${formatPercent(holding.volatility)}`,
              `Annual return: ${formatSignedPercent(holding.annualReturn)}`,
              `Weight: ${formatPercent(holding.weight)}`,
            ]
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Annualised volatility', color: palette.muted },
        ticks: { callback: (value) => formatPercent(Number(value), 0) },
        grid: { color: palette.grid },
      },
      y: {
        title: { display: true, text: 'Historical annual return', color: palette.muted },
        ticks: { callback: (value) => formatPercent(Number(value), 0) },
        grid: { color: (ctx) => (ctx.tick.value === 0 ? palette.zeroLine : palette.grid) },
      },
    },
  }

  return (
    <div className="chart-frame" style={{ height: 300 }}>
      <Scatter
        aria-label="Risk versus return scatter plot of portfolio holdings; point size shows portfolio weight"
        role="img"
        options={options}
        data={{
          datasets: [
            {
              data: holdings.map((holding) => ({ x: holding.volatility, y: holding.annualReturn })),
              backgroundColor: 'rgba(110, 168, 254, 0.55)',
              borderColor: palette.accent,
              borderWidth: 1.5,
              pointRadius: holdings.map((holding) => 5 + Math.min(holding.weight, 0.3) * 40),
              pointHoverRadius: holdings.map((holding) => 7 + Math.min(holding.weight, 0.3) * 40),
            },
          ],
        }}
      />
    </div>
  )
}

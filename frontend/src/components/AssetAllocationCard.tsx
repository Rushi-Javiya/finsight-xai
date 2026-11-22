import type { AssetAllocation, AssetClass } from '../api/types'
import { DoughnutChart } from './charts/DoughnutChart'
import { assetClassColors } from './charts/theme'
import { Card } from './ui'

const LABELS: Record<AssetClass, string> = {
  STOCKS: 'Stocks',
  ETFS: 'ETFs',
  BONDS: 'Bonds',
  CASH: 'Cash',
}

const LABELS_RISK = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' } as const

export function AssetAllocationCard({ allocation }: { allocation: AssetAllocation }) {
  const items = allocation.allocations
  return (
    <Card title="Asset allocation" id="allocation" subtitle={`Age ${allocation.age} · ${LABELS_RISK[allocation.riskLevel]} risk`}>
      <div className="allocation-body">
        <DoughnutChart
          labels={items.map((item) => LABELS[item.assetClass])}
          values={items.map((item) => item.percentage)}
          colors={items.map((item) => assetClassColors[item.assetClass])}
          ariaLabel={`Asset allocation: ${items.map((item) => `${LABELS[item.assetClass]} ${item.percentage}%`).join(', ')}`}
          formatValue={(value) => `${value}%`}
          height={180}
        />
        <ul className="legend">
          {items.map((item) => (
            <li key={item.assetClass}>
              <span className="swatch" style={{ background: assetClassColors[item.assetClass] }} aria-hidden="true" />
              <span className="legend-label">{LABELS[item.assetClass]}</span>
              <span className="num legend-value">{item.percentage}%</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="muted">{allocation.explanation}</p>
    </Card>
  )
}

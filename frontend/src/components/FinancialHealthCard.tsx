import type { FinancialHealth, HealthStatus } from '../api/types'
import { formatCurrency, formatPercent } from '../lib/format'
import { Badge, Card } from './ui'

const SAVINGS_TARGET = 0.2

const STATUS: Record<HealthStatus, { label: string; tone: 'positive' | 'warning' | 'negative' }> = {
  HEALTHY: { label: 'Healthy', tone: 'positive' },
  LOW_SAVINGS: { label: 'Low savings', tone: 'warning' },
  OVERSPENDING: { label: 'Overspending', tone: 'negative' },
}

interface Props {
  health: FinancialHealth
  currency: string
}

export function FinancialHealthCard({ health, currency }: Props) {
  const status = STATUS[health.status]
  const progress = Math.max(0, Math.min(health.savingsRate / SAVINGS_TARGET, 1))
  return (
    <Card title="Financial health" id="health" actions={<Badge tone={status.tone}>{status.label}</Badge>}>
      <p className="lead">{health.message}</p>

      <div className="progress-block">
        <div className="progress-labels">
          <span>Savings rate</span>
          <span className={`num ${health.savingsRate < 0 ? 'negative' : ''}`.trim()}>{formatPercent(health.savingsRate)}</span>
        </div>
        <div
          className={`progress progress-${status.tone}`}
          role="progressbar"
          aria-label="Savings rate versus 20% target"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-valuetext={`${formatPercent(health.savingsRate)} saved, target ${formatPercent(SAVINGS_TARGET, 0)}`}
        >
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="progress-caption">Target: {formatPercent(SAVINGS_TARGET, 0)} of income</p>
      </div>

      <dl className="stat-list">
        <div>
          <dt>Monthly savings</dt>
          <dd className={`num ${health.savings < 0 ? 'negative' : ''}`.trim()}>{formatCurrency(health.savings, currency)}</dd>
        </div>
        <div>
          <dt>Recommended monthly savings</dt>
          <dd className="num">{formatCurrency(health.recommendedMonthlySavings, currency)}</dd>
        </div>
        <div>
          <dt>Emergency fund target</dt>
          <dd className="num">{formatCurrency(health.emergencyFundTarget, currency)}</dd>
        </div>
      </dl>
    </Card>
  )
}

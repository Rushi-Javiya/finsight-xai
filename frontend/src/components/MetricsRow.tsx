import type { PortfolioRecommendation } from '../api/types'
import { formatDate, formatNumber, formatPercent, formatSignedPercent } from '../lib/format'
import { Badge, InfoTip, SignedValue } from './ui'

interface Props {
  portfolio: PortfolioRecommendation
}

export function MetricsRow({ portfolio }: Props) {
  const { metrics } = portfolio
  const kpis = [
    {
      label: 'Historical annualised return',
      info: 'Average yearly return this mix earned over the look-back window. It is backward-looking, not a forecast.',
      value: <SignedValue value={metrics.expectedAnnualReturn}>{formatSignedPercent(metrics.expectedAnnualReturn)}</SignedValue>,
    },
    {
      label: 'Volatility',
      info: 'Annualised standard deviation of portfolio returns. Higher means larger swings in value.',
      value: <span className="num">{formatPercent(metrics.annualVolatility)}</span>,
    },
    {
      label: 'Sharpe ratio',
      info: `Return above the ${formatPercent(metrics.riskFreeRate)} risk-free rate per unit of volatility. Higher is better.`,
      value: <span className="num">{formatNumber(metrics.sharpeRatio)}</span>,
    },
    {
      label: 'Max drawdown',
      info: 'Largest peak-to-trough fall of the portfolio over the historical window.',
      value: <SignedValue value={metrics.maxDrawdown}>{formatSignedPercent(metrics.maxDrawdown)}</SignedValue>,
    },
    {
      label: 'Diversification ratio',
      info: 'Weighted average volatility of the holdings divided by portfolio volatility. Above 1 means diversification is lowering risk.',
      value: <span className="num">{formatNumber(metrics.diversificationRatio)}</span>,
    },
    {
      label: 'Effective holdings',
      info: 'Number of equally weighted positions that would be as concentrated as this portfolio (1 ÷ Σ weight²).',
      value: <span className="num">{formatNumber(metrics.effectiveHoldings, 1)}</span>,
    },
  ]

  return (
    <section aria-labelledby="metrics-title" className="metrics">
      <div className="metrics-header">
        <h2 id="metrics-title" className="card-title">
          Portfolio metrics
        </h2>
        <ul className="meta-list">
          <li>
            <Badge tone={portfolio.dataSource === 'yahoo' ? 'accent' : 'warning'}>
              {portfolio.dataSource === 'yahoo' ? 'Data: Yahoo Finance' : `Data: ${portfolio.dataSource}`}
            </Badge>
          </li>
          <li>As of {formatDate(portfolio.asOf)}</li>
          <li>{portfolio.universeSize} stocks screened</li>
        </ul>
      </div>
      <dl className="kpi-grid">
        {kpis.map((kpi) => (
          <div className="kpi" key={kpi.label}>
            <dt>
              {kpi.label} <InfoTip text={kpi.info} />
            </dt>
            <dd>{kpi.value}</dd>
          </div>
        ))}
      </dl>
      {portfolio.dataSource !== 'yahoo' && (
        <p className="muted small">
          Prices come from a synthetic data set rather than live market data, so figures are illustrative only.
        </p>
      )}
    </section>
  )
}

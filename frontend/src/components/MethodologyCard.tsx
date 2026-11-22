import type { PortfolioRecommendation } from '../api/types'
import { formatNumber, formatPercent, formatSigned, humanize } from '../lib/format'
import { Badge, Card, InfoTip } from './ui'

const FACTOR_LABELS: Record<string, string> = {
  momentum: 'Momentum',
  low_volatility: 'Low volatility',
  value: 'Value',
  growth: 'Growth',
  quality: 'Quality',
  sentiment: 'Sentiment',
  ml_signal: 'ML signal',
}

export function MethodologyCard({ portfolio }: { portfolio: PortfolioRecommendation }) {
  const { model } = portfolio
  const weights = Object.entries(portfolio.factorWeights).sort((a, b) => b[1] - a[1])
  return (
    <Card title="Methodology & model card" id="methodology">
      <p className="prewrap">{portfolio.methodology}</p>

      <div className="method-grid">
        <div>
          <h3 className="subheading">Factor weights</h3>
          <table className="data-table compact" aria-label="Factor weights">
            <thead>
              <tr>
                <th scope="col">Factor</th>
                <th scope="col" className="right">Weight</th>
              </tr>
            </thead>
            <tbody>
              {weights.map(([factor, weight]) => (
                <tr key={factor}>
                  <th scope="row">{FACTOR_LABELS[factor] ?? humanize(factor)}</th>
                  <td className="num right">
                    {formatPercent(weight)}
                    {factor === 'ml_signal' && weight === 0 && <span className="muted"> (excluded)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="subheading">Machine-learning model</h3>
          {model ? (
            <>
              <dl className="def-list">
                <div>
                  <dt>Model</dt>
                  <dd>{model.name}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <Badge tone={model.active ? 'positive' : 'warning'}>{model.active ? 'Active in score' : 'Inactive – excluded from score'}</Badge>
                  </dd>
                </div>
                <div>
                  <dt>Training samples</dt>
                  <dd className="num">{formatNumber(model.trainedSamples, 0)}</dd>
                </div>
                <div>
                  <dt>
                    Validation rank IC{' '}
                    <InfoTip text="Out-of-sample rank correlation between predicted and realised relative returns. Zero or below means no better than chance." />
                  </dt>
                  <dd className="num">{model.validationRankIc === null ? 'n/a' : formatSigned(model.validationRankIc, 3)}</dd>
                </div>
                <div>
                  <dt>Prediction horizon</dt>
                  <dd className="num">{model.horizonDays} trading days</dd>
                </div>
              </dl>
              {model.features.length > 0 && (
                <>
                  <h4 className="subheading small">Input features</h4>
                  <ul className="chips">
                    {model.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p className="muted">There was not enough price history to train a machine-learning model for this market.</p>
          )}
        </div>
      </div>

      <aside className="disclaimer" role="note" aria-label="Disclaimer">
        <strong>Important</strong>
        <p>{portfolio.disclaimer}</p>
      </aside>
    </Card>
  )
}

import { useCallback, useMemo } from 'react'
import { getStockDetail } from '../api/client'
import type { Country, FactorContribution, Holding, ModelInfo, RiskLevel } from '../api/types'
import { useAsync } from '../hooks/useAsync'
import { formatCurrency, formatNumber, formatPercent, formatSigned, formatSignedPercent } from '../lib/format'
import { BarsChart } from './charts/BarsChart'
import type { BarItem } from './charts/BarsChart'
import { PriceChart } from './charts/PriceChart'
import { SignedValue } from './ui'

interface Props {
  holding: Holding
  currency: string
  riskLevel: RiskLevel
  country: Country
  model: ModelInfo | null
}

const signedScore = (value: number) => formatSigned(value, 3)

function factorTooltip(factor: FactorContribution): string[] {
  if (factor.imputed) return [`${factor.label}: data missing – treated as neutral (z = 0)`, `Weight: ${formatPercent(factor.weight)}`]
  return [
    `Value: ${factor.displayValue}`,
    `Percentile: ${factor.percentile === null ? 'n/a' : `${factor.percentile.toFixed(0)}`}`,
    `z-score: ${formatSigned(factor.zScore)}`,
    `Weight: ${formatPercent(factor.weight)}`,
    `Contribution: ${signedScore(factor.contribution)}`,
  ]
}

function PriceHistory({ ticker, riskLevel, country, currency }: Omit<Props, 'holding' | 'model'> & { ticker: string }) {
  const load = useCallback(
    (signal: AbortSignal) => getStockDetail(ticker, { riskLevel, country }, signal),
    [ticker, riskLevel, country],
  )
  const state = useAsync(load)

  if (state.status === 'loading') return <div className="skeleton skeleton-chart" aria-hidden="true" />
  if (state.status === 'error' || state.data.priceHistory.length < 2) {
    return <p className="muted small">Six-month price history is not available right now.</p>
  }
  const points = state.data.priceHistory
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) return null
  const change = last.close / first.close - 1
  return (
    <>
      <PriceChart points={points} currency={currency} ticker={ticker} />
      <p className="muted small">
        {first.date} to {last.date}: {formatCurrency(first.close, currency, 2)} → {formatCurrency(last.close, currency, 2)} (
        <SignedValue value={change}>{formatSignedPercent(change)}</SignedValue>)
      </p>
    </>
  )
}

export function HoldingExplanation({ holding, currency, riskLevel, country, model }: Props) {
  const factorItems = useMemo<BarItem[]>(
    () =>
      holding.factors.map((factor) => ({
        label: factor.imputed ? `${factor.label} (missing)` : factor.label,
        value: factor.contribution,
        muted: factor.imputed,
        tooltip: factorTooltip(factor),
      })),
    [holding.factors],
  )
  const driverItems = useMemo<BarItem[]>(
    () =>
      holding.mlDrivers.map((driver) => ({
        label: driver.label,
        value: driver.contribution,
        tooltip: [
          ...(driver.value === null ? [] : [`Feature value: ${formatNumber(driver.value, 3)}`]),
          `SHAP contribution: ${formatSigned(driver.contribution, 4)}`,
        ],
      })),
    [holding.mlDrivers],
  )
  const hasMissing = holding.factors.some((factor) => factor.imputed)

  return (
    <div className="explanation">
      <div className="explanation-main">
        <h3 className="explanation-title">
          Why {holding.ticker} ranks #{holding.rank}
        </h3>
        <p className="lead">{holding.explanation}</p>

        <div className="explain-section">
          <h4>Factor contributions to the score</h4>
          {factorItems.length > 0 ? (
            <>
              <BarsChart
                items={factorItems}
                formatValue={(value) => formatSigned(value, 2)}
                ariaLabel={`Factor contributions to the ${holding.ticker} score`}
              />
              {hasMissing && (
                <p className="muted small">Hatched bars are factors with missing data – they are treated as neutral and add nothing.</p>
              )}
              <div className="table-wrap">
                <table className="data-table compact" aria-label={`Factor breakdown for ${holding.ticker}`}>
                  <thead>
                    <tr>
                      <th scope="col">Factor</th>
                      <th scope="col" className="right">Value</th>
                      <th scope="col" className="right">Percentile</th>
                      <th scope="col" className="right">z-score</th>
                      <th scope="col" className="right">Weight</th>
                      <th scope="col" className="right">Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holding.factors.map((factor) => (
                      <tr key={factor.factor}>
                        <th scope="row">{factor.label}</th>
                        {factor.imputed ? (
                          <td colSpan={3} className="right muted">
                            missing – neutral
                          </td>
                        ) : (
                          <>
                            <td className="num right">{factor.displayValue}</td>
                            <td className="num right">{factor.percentile === null ? '–' : factor.percentile.toFixed(0)}</td>
                            <td className="num right">{formatSigned(factor.zScore)}</td>
                          </>
                        )}
                        <td className="num right">{formatPercent(factor.weight)}</td>
                        <td className="right">
                          <SignedValue value={factor.contribution}>{signedScore(factor.contribution)}</SignedValue>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="score-line">
                How the score adds up:{' '}
                {holding.factors.map((factor, index) => (
                  <span key={factor.factor} className="score-term">
                    {index > 0 && <span aria-hidden="true"> </span>}
                    <SignedValue value={factor.contribution}>{signedScore(factor.contribution)}</SignedValue>
                  </span>
                ))}{' '}
                = <strong className="num">{formatNumber(holding.score, 3)}</strong>
              </p>
            </>
          ) : (
            <p className="muted">No factor breakdown is available for this holding.</p>
          )}
        </div>
      </div>

      <div className="explanation-side">
        <div className="explain-section">
          <h4>What drives the ML outlook</h4>
          {model?.active === false && (
            <p className="notice" role="note">
              ML outlook was excluded from the score because it did not beat chance out-of-sample — shown for transparency.
            </p>
          )}
          {model === null && <p className="muted small">Not enough price history to train the ML model for this market.</p>}
          {driverItems.length > 0 ? (
            <>
              <BarsChart
                items={driverItems}
                formatValue={(value) => formatSigned(value, 2)}
                ariaLabel={`Machine-learning drivers for ${holding.ticker}`}
              />
              <ul className="sr-only">
                {holding.mlDrivers.map((driver) => (
                  <li key={driver.feature}>
                    {driver.label}: {formatSigned(driver.contribution, 4)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            model !== null && <p className="muted small">No ML drivers were reported for this holding.</p>
          )}
        </div>

        <div className="explain-section">
          <h4>Six-month price</h4>
          <PriceHistory ticker={holding.ticker} riskLevel={riskLevel} country={country} currency={currency} />
        </div>

        {holding.dataQualityNotes.length > 0 && (
          <div className="explain-section">
            <h4>Data quality notes</h4>
            <ul className="notes">
              {holding.dataQualityNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

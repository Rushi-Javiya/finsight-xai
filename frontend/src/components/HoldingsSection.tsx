import { Fragment, useMemo, useState } from 'react'
import type { Holding, PortfolioRecommendation } from '../api/types'
import { formatCurrency, formatNumber, formatPercent, formatSignedPercent } from '../lib/format'
import { DoughnutChart } from './charts/DoughnutChart'
import { categoricalColor } from './charts/theme'
import { HoldingExplanation } from './HoldingExplanation'
import { Card, SignedValue } from './ui'

type SortKey = 'rank' | 'ticker' | 'sector' | 'weight' | 'allocationAmount' | 'annualReturn' | 'volatility' | 'score'
type SortDirection = 'asc' | 'desc'

interface Column {
  key: SortKey
  label: string
  numeric: boolean
}

const COLUMNS: Column[] = [
  { key: 'rank', label: 'Rank', numeric: true },
  { key: 'ticker', label: 'Stock', numeric: false },
  { key: 'sector', label: 'Sector', numeric: false },
  { key: 'weight', label: 'Weight', numeric: true },
  { key: 'allocationAmount', label: 'Amount', numeric: true },
  { key: 'annualReturn', label: 'Annual return', numeric: true },
  { key: 'volatility', label: 'Volatility', numeric: true },
  { key: 'score', label: 'Score', numeric: true },
]

function sortValue(holding: Holding, key: SortKey): string | number {
  if (key === 'allocationAmount') return holding.allocationAmount ?? Number.NEGATIVE_INFINITY
  return holding[key]
}

function compare(a: Holding, b: Holding, key: SortKey, direction: SortDirection): number {
  const left = sortValue(a, key)
  const right = sortValue(b, key)
  const result = typeof left === 'string' && typeof right === 'string' ? left.localeCompare(right) : Number(left) - Number(right)
  return direction === 'asc' ? result : -result
}

export function HoldingsSection({ portfolio }: { portfolio: PortfolioRecommendation }) {
  const { holdings, currency } = portfolio
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'rank', direction: 'asc' })
  const [expanded, setExpanded] = useState<string | null>(null)

  const hasAmounts = holdings.some((holding) => holding.allocationAmount != null)
  const columns = hasAmounts ? COLUMNS : COLUMNS.filter((column) => column.key !== 'allocationAmount')
  const sorted = useMemo(
    () => [...holdings].sort((a, b) => compare(a, b, sort.key, sort.direction)),
    [holdings, sort],
  )
  const colorByTicker = useMemo(
    () => new Map(holdings.map((holding, index) => [holding.ticker, categoricalColor(index)])),
    [holdings],
  )

  const toggleSort = (key: SortKey) =>
    setSort((previous) =>
      previous.key === key
        ? { key, direction: previous.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'ticker' || key === 'sector' || key === 'rank' ? 'asc' : 'desc' },
    )

  return (
    <Card
      title="Holdings"
      id="holdings"
      subtitle="Select a stock to see exactly why it was chosen and how much each factor contributed."
    >
      <div className="holdings-overview">
        <DoughnutChart
          labels={holdings.map((holding) => holding.ticker)}
          values={holdings.map((holding) => holding.weight)}
          colors={holdings.map((holding) => colorByTicker.get(holding.ticker) ?? '#94a3b8')}
          ariaLabel="Portfolio weights by holding"
          formatValue={(value) => formatPercent(value)}
          height={200}
        />
        <ul className="legend legend-wrap">
          {holdings.map((holding) => (
            <li key={holding.ticker}>
              <span className="swatch" style={{ background: colorByTicker.get(holding.ticker) }} aria-hidden="true" />
              <span className="legend-label">{holding.ticker}</span>
              <span className="num legend-value">{formatPercent(holding.weight)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="table-wrap">
        <table className="data-table holdings-table">
          <caption className="sr-only">Portfolio holdings. Column headers are buttons that sort the table.</caption>
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sort.key === column.key
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={`col-${column.key} ${column.numeric ? 'right' : ''}`}
                    aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button type="button" className="sort-button" onClick={() => toggleSort(column.key)}>
                      {column.label}
                      <span className="sort-indicator" aria-hidden="true">
                        {active ? (sort.direction === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((holding) => {
              const open = expanded === holding.ticker
              const panelId = `holding-panel-${holding.ticker}`
              return (
                <Fragment key={holding.ticker}>
                  <tr className={open ? 'row-open' : undefined}>
                    <td className="num right">{holding.rank}</td>
                    <td>
                      <button
                        type="button"
                        className="expand-button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setExpanded(open ? null : holding.ticker)}
                      >
                        <span className="chevron" aria-hidden="true" />
                        <span className="ticker">{holding.ticker}</span>
                        <span className="holding-name">{holding.name}</span>
                      </button>
                    </td>
                    <td className="col-sector">{holding.sector}</td>
                    <td className="num right">{formatPercent(holding.weight)}</td>
                    {hasAmounts && (
                      <td className="num right col-allocationAmount">
                        {holding.allocationAmount == null ? '–' : formatCurrency(holding.allocationAmount, currency)}
                      </td>
                    )}
                    <td className="right">
                      <SignedValue value={holding.annualReturn}>{formatSignedPercent(holding.annualReturn)}</SignedValue>
                    </td>
                    <td className="num right col-volatility">{formatPercent(holding.volatility)}</td>
                    <td className="num right">{formatNumber(holding.score, 3)}</td>
                  </tr>
                  {open && (
                    <tr className="detail-row" id={panelId}>
                      <td colSpan={columns.length}>
                        <div className="explanation-wrap">
                          <HoldingExplanation
                            holding={holding}
                            currency={currency}
                            riskLevel={portfolio.riskLevel}
                            country={portfolio.country}
                            model={portfolio.model}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

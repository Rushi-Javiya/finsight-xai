import type { Holding } from '../api/types'
import { formatPercent, formatSignedPercent } from '../lib/format'
import { RiskReturnChart } from './charts/RiskReturnChart'
import { Card } from './ui'

export function RiskReturnCard({ holdings }: { holdings: Holding[] }) {
  return (
    <Card
      title="Risk vs return"
      id="risk-return"
      subtitle="Each point is a holding; larger points carry more portfolio weight."
    >
      <RiskReturnChart holdings={holdings} />
      <table className="sr-only">
        <caption>Volatility and historical return by holding</caption>
        <thead>
          <tr>
            <th scope="col">Ticker</th>
            <th scope="col">Volatility</th>
            <th scope="col">Annual return</th>
            <th scope="col">Weight</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => (
            <tr key={holding.ticker}>
              <th scope="row">{holding.ticker}</th>
              <td>{formatPercent(holding.volatility)}</td>
              <td>{formatSignedPercent(holding.annualReturn)}</td>
              <td>{formatPercent(holding.weight)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

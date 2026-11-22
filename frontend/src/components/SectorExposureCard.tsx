import { formatPercent } from '../lib/format'
import { Card } from './ui'

export function SectorExposureCard({ exposure }: { exposure: Record<string, number> }) {
  const entries = Object.entries(exposure).sort((a, b) => b[1] - a[1])
  const max = entries[0]?.[1] ?? 1
  return (
    <Card title="Sector exposure" id="sectors" subtitle="Share of the portfolio by sector.">
      {entries.length === 0 ? (
        <p className="muted">No sector data available.</p>
      ) : (
        <ul className="bar-list">
          {entries.map(([sector, share]) => (
            <li key={sector}>
              <div className="bar-list-row">
                <span>{sector}</span>
                <span className="num">{formatPercent(share)}</span>
              </div>
              <div className="bar-track" aria-hidden="true">
                <div className="bar-fill" style={{ width: `${(share / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

import { useCallback, useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { getAdviceHistory } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { formatDateTime, formatPercent, formatSignedPercent } from '../lib/format'
import { Badge } from './ui'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function HistoryDrawer({ onClose }: { onClose: () => void }) {
  const load = useCallback((signal: AbortSignal) => getAdviceHistory(20, signal), [])
  const state = useAsync(load)
  const panel = useRef<HTMLElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButton.current?.focus()
    return () => opener?.focus()
  }, [])

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    if (event.key !== 'Tab' || !panel.current) return
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="drawer-root" onKeyDown={handleKeyDown}>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="history-title" ref={panel}>
        <header className="drawer-header">
          <h2 id="history-title" className="card-title">
            Recent analyses
          </h2>
          <button type="button" className="btn btn-ghost btn-small" onClick={onClose} ref={closeButton}>
            Close
          </button>
        </header>
        <div className="drawer-body" aria-live="polite">
          {state.status === 'loading' && (
            <>
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
              <span className="sr-only">Loading history</span>
            </>
          )}
          {state.status === 'error' && <p className="muted">History is unavailable right now. Your recommendations are not affected.</p>}
          {state.status === 'success' && state.data.length === 0 && <p className="muted">No analyses yet. Run one to see it here.</p>}
          {state.status === 'success' && state.data.length > 0 && (
            <ul className="history-list">
              {state.data.map((item) => (
                <li key={item.id}>
                  <div className="history-top">
                    <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
                    <span className="history-badges">
                      <Badge tone="neutral">{item.riskLevel.toLowerCase()} risk</Badge>
                      <Badge tone="neutral">{item.country}</Badge>
                    </span>
                  </div>
                  <p className="history-tickers">{item.tickers.join(', ') || 'No portfolio generated'}</p>
                  {item.expectedAnnualReturn !== null && item.annualVolatility !== null && (
                    <p className="muted small">
                      Return {formatSignedPercent(item.expectedAnnualReturn)} · Volatility {formatPercent(item.annualVolatility)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}

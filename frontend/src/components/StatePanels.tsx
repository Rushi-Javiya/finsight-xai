import { useState } from 'react'
import type { ApiError } from '../api/client'

export function EmptyState() {
  return (
    <section className="card empty-state" aria-labelledby="empty-title">
      <h2 id="empty-title" className="card-title">
        Build an explainable portfolio
      </h2>
      <p>
        Enter your monthly figures and risk tolerance. FinSight checks your financial health, suggests an asset
        allocation, and ranks stocks with a transparent multi-factor score.
      </p>
      <ol className="steps">
        <li>
          <strong>Assess</strong>
          <span>Savings rate, emergency fund and a recommended monthly contribution.</span>
        </li>
        <li>
          <strong>Allocate</strong>
          <span>A stocks / ETFs / bonds / cash split matched to your age and risk level.</span>
        </li>
        <li>
          <strong>Explain</strong>
          <span>Every holding shows exactly which factors lifted or lowered its score.</span>
        </li>
      </ol>
    </section>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="skeleton-grid" aria-hidden="true">
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-row" />
      <div className="skeleton skeleton-tall" />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
    </div>
  )
}

interface ErrorPanelProps {
  error: ApiError
  onRetry: () => void
}

export function ErrorPanel({ error, onRetry }: ErrorPanelProps) {
  const rejected = Object.keys(error.fieldErrors).length > 0
  return (
    <section className="card error-panel" role="alert">
      <h2 className="card-title">{rejected ? 'Please check your inputs' : 'We could not complete the analysis'}</h2>
      <p>
        {rejected
          ? 'Some values were rejected by the server. Correct the highlighted fields and submit again.'
          : (error.detail ?? error.title)}
      </p>
      {!rejected && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  )
}

export function WarningBanner({ warnings }: { warnings: string[] }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || warnings.length === 0) return null
  return (
    <div className="banner" role="status">
      <div className="banner-body">
        <strong>Heads up</strong>
        <ul>
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </div>
      <button type="button" className="btn btn-ghost btn-small" onClick={() => setDismissed(true)} aria-label="Dismiss warnings">
        Dismiss
      </button>
    </div>
  )
}

import type { ReactNode } from 'react'

interface CardProps {
  title: string
  id?: string
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function Card({ title, id, subtitle, actions, className = '', children }: CardProps) {
  const headingId = id ? `${id}-title` : undefined
  return (
    <section className={`card ${className}`.trim()} id={id} aria-labelledby={headingId}>
      <header className="card-header">
        <div>
          <h2 id={headingId} className="card-title">
            {title}
          </h2>
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}

type BadgeTone = 'positive' | 'negative' | 'warning' | 'neutral' | 'accent'

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="info-tip" tabIndex={0} role="note" aria-label={text} data-tip={text} title={text}>
      i
    </span>
  )
}

export function SignedValue({ value, children }: { value: number; children: ReactNode }) {
  const tone = value > 0 ? 'positive' : value < 0 ? 'negative' : ''
  return <span className={`num ${tone}`.trim()}>{children}</span>
}

interface Props {
  onOpenHistory: () => void
}

export function Header({ onOpenHistory }: Props) {
  return (
    <header className="app-header">
      <div className="brand">
        <svg className="brand-mark" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false">
          <rect width="32" height="32" rx="8" fill="#6ea8fe" />
          <path d="M7 22l6-7 4 4 8-10" fill="none" stroke="#0b1220" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <h1 className="brand-name">FinSight</h1>
          <p className="brand-tagline">Portfolio recommendations you can audit</p>
        </div>
      </div>
      <button type="button" className="btn btn-ghost" onClick={onOpenHistory}>
        History
      </button>
    </header>
  )
}

export function Footer({ disclaimer }: { disclaimer?: string }) {
  return (
    <footer className="app-footer">
      <p>
        {disclaimer ??
          'FinSight is an educational tool, not investment advice. Past performance does not guarantee future results.'}
      </p>
    </footer>
  )
}

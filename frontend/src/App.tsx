import { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { Footer, Header } from './components/Header'
import { HistoryDrawer } from './components/HistoryDrawer'
import { ProfileForm } from './components/ProfileForm'
import { DashboardSkeleton, EmptyState, ErrorPanel } from './components/StatePanels'
import { useAdvice } from './hooks/useAdvice'

const NO_ERRORS: Record<string, string> = {}

const STATUS_MESSAGES = {
  idle: '',
  loading: 'Analysing your profile…',
  success: 'Recommendations updated.',
  error: 'The analysis failed.',
} as const

export default function App() {
  const { state, submit, retry } = useAdvice()
  const [historyOpen, setHistoryOpen] = useState(false)

  const serverErrors = state.status === 'error' ? state.error.fieldErrors : NO_ERRORS
  const disclaimer = state.status === 'success' ? state.data.portfolio?.disclaimer : undefined

  return (
    <div className="app">
      <a className="skip-link" href="#results">
        Skip to results
      </a>
      <Header onOpenHistory={() => setHistoryOpen(true)} />
      <main className="layout">
        <div className="layout-form">
          <ProfileForm loading={state.status === 'loading'} serverErrors={serverErrors} onSubmit={(request) => void submit(request)} />
        </div>
        <div className="layout-results" id="results" tabIndex={-1}>
          <p className="sr-only" role="status" aria-live="polite">
            {STATUS_MESSAGES[state.status]}
          </p>
          {state.status === 'idle' && <EmptyState />}
          {state.status === 'loading' && <DashboardSkeleton />}
          {state.status === 'error' && <ErrorPanel error={state.error} onRetry={retry} />}
          {state.status === 'success' && <Dashboard key={state.data.id} data={state.data} request={state.request} />}
        </div>
      </main>
      <Footer disclaimer={disclaimer} />
      {historyOpen && <HistoryDrawer onClose={() => setHistoryOpen(false)} />}
    </div>
  )
}

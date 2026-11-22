import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import {
  adviceFixture,
  adviceWithoutPortfolioFixture,
  historyFixture,
  jsonResponse,
  problemJson,
  stockDetailFixture,
} from './test/fixtures'
import type { AdviceResponse } from './api/types'

type Responder = () => Response | Promise<Response>

interface Routes {
  advice?: Responder
  history?: Responder
  stock?: Responder
}

function mockApi(routes: Routes = {}) {
  const fetchMock = vi.fn((url: string) => {
    if (url.startsWith('/api/v1/advice/history')) return Promise.resolve((routes.history ?? (() => jsonResponse(historyFixture)))())
    if (url.startsWith('/api/v1/advice')) return Promise.resolve((routes.advice ?? (() => jsonResponse(adviceFixture)))())
    if (url.startsWith('/api/v1/stocks/')) return Promise.resolve((routes.stock ?? (() => jsonResponse(stockDetailFixture)))())
    return Promise.resolve(problemJson(404, 'Not found'))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function submitProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Monthly income'), '5000')
  await user.type(screen.getByLabelText('Monthly expenses'), '3000')
  await user.type(screen.getByLabelText('Age'), '30')
  await user.click(screen.getByRole('button', { name: 'Get recommendations' }))
}

describe('App', () => {
  it('shows the empty state before any analysis', () => {
    mockApi()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'FinSight' })).toBeInTheDocument()
    expect(screen.getByText('Portfolio recommendations you can audit')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Build an explainable portfolio' })).toBeInTheDocument()
  })

  it('renders the dashboard from the advice response', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    render(<App />)

    await submitProfile(user)

    const health = await screen.findByRole('region', { name: 'Financial health' })
    expect(within(health).getByText('Healthy')).toBeInTheDocument()
    expect(within(health).getByText('Good financial health')).toBeInTheDocument()
    expect(within(health).getByRole('progressbar', { name: /Savings rate versus 20% target/ })).toHaveAttribute('aria-valuenow', '100')
    expect(within(health).getByText('$18,000')).toBeInTheDocument()

    const allocation = screen.getByRole('region', { name: 'Asset allocation' })
    expect(within(allocation).getByText('ETFs')).toBeInTheDocument()
    expect(within(allocation).getByText('44%')).toBeInTheDocument()

    expect(screen.getByText('Historical annualised return')).toBeInTheDocument()
    expect(screen.getByText('+5.1%')).toBeInTheDocument()
    expect(screen.getByText('Data: Yahoo Finance')).toBeInTheDocument()
    expect(screen.getByText('20 stocks screened')).toBeInTheDocument()

    const table = screen.getByRole('table', { name: /Portfolio holdings/ })
    expect(within(table).getByText('NVIDIA Corporation')).toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(4)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/advice')
    expect(JSON.parse(String(init.body))).toMatchObject({ income: 5000, expenses: 3000, age: 30, riskLevel: 'MEDIUM', topN: 8 })
    expect(screen.getByRole('status')).toHaveTextContent('Recommendations updated.')
  })

  it('expands a holding to show its explanation, factor contributions and ML notice', async () => {
    mockApi()
    const user = userEvent.setup()
    render(<App />)
    await submitProfile(user)

    const toggle = await screen.findByRole('button', { name: /NVDA/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/ranks #1 of 20 for a medium-risk profile/)).toBeInTheDocument()

    const breakdown = screen.getByRole('table', { name: 'Factor breakdown for NVDA' })
    expect(within(breakdown).getByRole('rowheader', { name: 'Growth' })).toBeInTheDocument()
    expect(within(breakdown).getByText('+0.390')).toBeInTheDocument()
    expect(within(breakdown).getByText('−0.210')).toBeInTheDocument()
    expect(within(breakdown).getByText('missing – neutral')).toBeInTheDocument()

    expect(screen.getByRole('img', { name: 'Factor contributions to the NVDA score' })).toBeInTheDocument()
    expect(screen.getByText(/How the score adds up/)).toHaveTextContent('= 0.')
    expect(screen.getByRole('heading', { name: 'What drives the ML outlook' })).toBeInTheDocument()
    expect(screen.getByText(/ML outlook was excluded from the score because it did not beat chance out-of-sample/)).toBeInTheDocument()
    
    expect(screen.getByText('Sentiment data was unavailable and treated as neutral.')).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'Six-month closing price chart for NVDA' })).toBeInTheDocument()

    await user.click(toggle)
    expect(screen.queryByText(/ranks #1 of 20/)).not.toBeInTheDocument()
  })

  it('does not block the explanation when the price history request fails', async () => {
    mockApi({ stock: () => problemJson(502, 'Bad gateway') })
    const user = userEvent.setup()
    render(<App />)
    await submitProfile(user)

    await user.click(await screen.findByRole('button', { name: /JPM/ }))

    expect(screen.getByText(/JPMorgan Chase & Co. ranks #2/)).toBeInTheDocument()
    expect(await screen.findByText('Six-month price history is not available right now.')).toBeInTheDocument()
  })

  it('does not show the ML-inactive notice when the model is active', async () => {
    const active: AdviceResponse = {
      ...adviceFixture,
      portfolio: adviceFixture.portfolio && {
        ...adviceFixture.portfolio,
        model: adviceFixture.portfolio.model && { ...adviceFixture.portfolio.model, active: true },
      },
    }
    mockApi({ advice: () => jsonResponse(active) })
    const user = userEvent.setup()
    render(<App />)
    await submitProfile(user)

    await user.click(await screen.findByRole('button', { name: /NVDA/ }))

    expect(screen.queryByText(/excluded from the score because it did not beat chance/)).not.toBeInTheDocument()
  })

  it('sorts the holdings table when a column header is activated', async () => {
    mockApi()
    const user = userEvent.setup()
    render(<App />)
    await submitProfile(user)
    const table = await screen.findByRole('table', { name: /Portfolio holdings/ })

    const firstTicker = () => within(table).getAllByRole('row')[1]?.querySelector('.ticker')?.textContent
    expect(firstTicker()).toBe('NVDA')

    await user.click(within(table).getByRole('button', { name: /Weight/ }))
    expect(firstTicker()).toBe('JPM')
    expect(within(table).getByRole('columnheader', { name: /Weight/ })).toHaveAttribute('aria-sort', 'descending')

    await user.click(within(table).getByRole('button', { name: /Weight/ }))
    expect(firstTicker()).toBe('NVDA')
    expect(within(table).getByRole('columnheader', { name: /Weight/ })).toHaveAttribute('aria-sort', 'ascending')
  })

  it('shows a dismissible warning and keeps health and allocation when the portfolio is null', async () => {
    mockApi({ advice: () => jsonResponse(adviceWithoutPortfolioFixture) })
    const user = userEvent.setup()
    render(<App />)

    await submitProfile(user)

    expect(await screen.findByText(/The ML service is unavailable/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Financial health' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Asset allocation' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Stock portfolio unavailable' })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: /Portfolio holdings/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dismiss warnings' }))
    expect(screen.queryByText(/The ML service is unavailable/)).not.toBeInTheDocument()
  })

  it('shows server validation errors next to the fields', async () => {
    mockApi({ advice: () => problemJson(400, 'Validation failed', 'Request validation failed', { income: 'must be greater than 0' }) })
    const user = userEvent.setup()
    render(<App />)

    await submitProfile(user)

    expect(await screen.findByRole('heading', { name: 'Please check your inputs' })).toBeInTheDocument()
    expect(screen.getByLabelText('Monthly income')).toHaveAccessibleDescription('must be greater than 0')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('shows an error panel with a working retry for upstream failures', async () => {
    let calls = 0
    mockApi({ advice: () => (++calls === 1 ? problemJson(503, 'Service unavailable', 'Backend is down') : jsonResponse(adviceFixture)) })
    const user = userEvent.setup()
    render(<App />)

    await submitProfile(user)
    expect(await screen.findByText('Backend is down')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('region', { name: 'Financial health' })).toBeInTheDocument()
    expect(screen.queryByText('Backend is down')).not.toBeInTheDocument()
  })

  it('lists recent analyses in the history drawer and closes with Escape', async () => {
    mockApi()
    const user = userEvent.setup()
    render(<App />)

    const opener = screen.getByRole('button', { name: 'History' })
    await user.click(opener)

    const dialog = screen.getByRole('dialog', { name: 'Recent analyses' })
    expect(await within(dialog).findByText('NVDA, META, JPM')).toBeInTheDocument()
    expect(within(dialog).getByText('No portfolio generated')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('treats a history failure as non-fatal', async () => {
    mockApi({ history: () => problemJson(500, 'Internal error') })
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'History' }))

    expect(await screen.findByText(/History is unavailable right now/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Build an explainable portfolio' })).toBeInTheDocument()
  })
})

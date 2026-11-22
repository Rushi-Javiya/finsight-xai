import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileForm } from './ProfileForm'

const noErrors = {}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Monthly income'), '5000')
  await user.type(screen.getByLabelText('Monthly expenses'), '3000')
  await user.type(screen.getByLabelText('Age'), '30')
}

describe('ProfileForm', () => {
  it('shows inline errors and does not submit invalid input', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ProfileForm loading={false} serverErrors={noErrors} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Get recommendations' }))

    expect(screen.getByText('Monthly income is required')).toBeInTheDocument()
    expect(screen.getByText('Age is required')).toBeInTheDocument()
    expect(screen.getByLabelText('Monthly income')).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('clears a field error once the user edits the field', async () => {
    const user = userEvent.setup()
    render(<ProfileForm loading={false} serverErrors={noErrors} onSubmit={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Get recommendations' }))

    await user.type(screen.getByLabelText('Monthly income'), '1')

    expect(screen.queryByText('Monthly income is required')).not.toBeInTheDocument()
  })

  it('submits a typed request, including the selected risk level and optional amount, and persists it', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ProfileForm loading={false} serverErrors={noErrors} onSubmit={onSubmit} />)

    await fillValid(user)
    await user.click(screen.getByRole('radio', { name: 'High' }))
    await user.selectOptions(screen.getByLabelText('Market'), 'IN')
    await user.type(screen.getByLabelText(/Investment amount \(INR, optional\)/), '10000')
    await user.click(screen.getByRole('button', { name: 'Get recommendations' }))

    expect(onSubmit).toHaveBeenCalledWith({
      income: 5000,
      expenses: 3000,
      age: 30,
      riskLevel: 'HIGH',
      country: 'IN',
      topN: 8,
      investmentAmount: 10000,
    })
    expect(JSON.parse(window.localStorage.getItem('finsight.profile.v1') ?? '{}')).toMatchObject({ income: '5000', riskLevel: 'HIGH' })
  })

  it('restores the last-used inputs from local storage', () => {
    window.localStorage.setItem(
      'finsight.profile.v1',
      JSON.stringify({ income: '7000', expenses: '2000', age: '41', riskLevel: 'LOW', country: 'US', topN: 5, investmentAmount: '' }),
    )

    render(<ProfileForm loading={false} serverErrors={noErrors} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Monthly income')).toHaveValue(7000)
    expect(screen.getByRole('radio', { name: 'Low' })).toBeChecked()
    expect(screen.getByLabelText('Number of holdings: 5')).toBeInTheDocument()
  })

  it('shows server field errors', () => {
    render(<ProfileForm loading={false} serverErrors={{ income: 'must be greater than 0' }} onSubmit={vi.fn()} />)

    expect(screen.getByText('must be greater than 0')).toBeInTheDocument()
    expect(screen.getByLabelText('Monthly income')).toHaveAccessibleDescription('must be greater than 0')
  })

  it('disables submit and announces busy state while loading', () => {
    render(<ProfileForm loading serverErrors={noErrors} onSubmit={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Analysing…' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('lets the user choose the number of holdings with the slider', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ProfileForm loading={false} serverErrors={noErrors} onSubmit={onSubmit} />)
    await fillValid(user)

    fireEvent.change(screen.getByRole('slider'), { target: { value: '10' } })
    await user.click(screen.getByRole('button', { name: 'Get recommendations' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ topN: 10 }))
  })
})

import {
  formatCompact,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatSigned,
  formatSignedPercent,
  humanize,
} from './format'

describe('formatCurrency', () => {
  it('formats by currency code without decimals by default', () => {
    expect(formatCurrency(5000, 'USD')).toBe('$5,000')
    expect(formatCurrency(10000, 'INR')).toBe('₹10,000')
  })

  it('supports fractional digits', () => {
    expect(formatCurrency(12.5, 'USD', 2)).toBe('$12.50')
  })

  it('keeps the sign for negative amounts', () => {
    expect(formatCurrency(-500, 'USD')).toMatch(/-\$500/)
  })
})

describe('formatPercent', () => {
  it('treats the input as a fraction', () => {
    expect(formatPercent(0.153)).toBe('15.3%')
    expect(formatPercent(0.4, 0)).toBe('40%')
  })
})

describe('formatSignedPercent', () => {
  it('prefixes positive and negative values', () => {
    expect(formatSignedPercent(0.0513)).toBe('+5.1%')
    expect(formatSignedPercent(-0.1413)).toBe('−14.1%')
  })

  it('does not show a sign for values that round to zero', () => {
    expect(formatSignedPercent(0)).toBe('0.0%')
    expect(formatSignedPercent(-0.00001)).toBe('0.0%')
  })
})

describe('formatSigned', () => {
  it('formats signed decimals', () => {
    expect(formatSigned(0.391, 3)).toBe('+0.391')
    expect(formatSigned(-1.4)).toBe('−1.40')
    expect(formatSigned(0)).toBe('0.00')
  })
})

describe('formatNumber and formatCompact', () => {
  it('formats grouped numbers', () => {
    expect(formatNumber(1.837)).toBe('1.84')
    expect(formatNumber(2160, 0)).toBe('2,160')
  })

  it('formats compact numbers', () => {
    expect(formatCompact(1_500_000)).toBe('1.5M')
    expect(formatCompact(12_300)).toBe('12.3K')
  })
})

describe('formatDate', () => {
  it('formats ISO timestamps in UTC', () => {
    expect(formatDate('2026-11-20T00:00:00Z')).toBe('Nov 20, 2026')
  })

  it('returns the input when it is not a date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})

describe('humanize', () => {
  it('turns snake_case keys into sentences', () => {
    expect(humanize('low_volatility')).toBe('Low volatility')
  })
})

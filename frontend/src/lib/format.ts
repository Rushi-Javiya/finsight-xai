const NUMBER_LOCALE = 'en-US'

export function formatCurrency(value: number, currency = 'USD', maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(NUMBER_LOCALE, {
    style: 'currency',
    currency,
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits === 0 ? 0 : undefined,
  }).format(value)
}

export function formatPercent(fraction: number, digits = 1): string {
  return new Intl.NumberFormat(NUMBER_LOCALE, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(fraction)
}

export function formatSignedPercent(fraction: number, digits = 1): string {
  const text = formatPercent(Math.abs(fraction), digits)
  const rounded = Number(Math.abs(fraction * 100).toFixed(digits))
  if (rounded === 0) return text
  return `${fraction < 0 ? '−' : '+'}${text}`
}

export function formatSigned(value: number, digits = 2): string {
  const text = Math.abs(value).toFixed(digits)
  if (Number(text) === 0) return text
  return `${value < 0 ? '−' : '+'}${text}`
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat(NUMBER_LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat(NUMBER_LOCALE, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(NUMBER_LOCALE, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
}

export function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(NUMBER_LOCALE, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(NUMBER_LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function humanize(key: string): string {
  const spaced = key.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

import { useId, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import type { AdviceRequest, Country, RiskLevel } from '../api/types'
import {
  loadStoredValues,
  storeValues,
  toAdviceRequest,
  TOP_N_MAX,
  TOP_N_MIN,
  validateProfile,
} from '../lib/validation'
import type { FormErrors, ProfileField, ProfileFormValues } from '../lib/validation'

interface Props {
  loading: boolean
  serverErrors: Record<string, string>
  onSubmit: (request: AdviceRequest) => void
}

const RISK_OPTIONS: { value: RiskLevel; label: string; hint: string }[] = [
  { value: 'LOW', label: 'Low', hint: 'Capital preservation' },
  { value: 'MEDIUM', label: 'Medium', hint: 'Balanced growth' },
  { value: 'HIGH', label: 'High', hint: 'Maximum growth' },
]

const CURRENCY_BY_COUNTRY: Record<Country, string> = { US: 'USD', IN: 'INR' }

interface FieldProps {
  id: string
  label: string
  error: string | undefined
  hint?: string
  children: ReactNode
}

function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function ProfileForm({ loading, serverErrors, onSubmit }: Props) {
  const uid = useId()
  const [values, setValues] = useState<ProfileFormValues>(() => loadStoredValues())
  const [errors, setErrors] = useState<FormErrors>(serverErrors)
  const [seenServerErrors, setSeenServerErrors] = useState(serverErrors)

  if (serverErrors !== seenServerErrors) {
    setSeenServerErrors(serverErrors)
    setErrors(serverErrors as FormErrors)
  }

  const update = <K extends ProfileField>(field: K, value: ProfileFormValues[K]) => {
    setValues((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [field]: undefined }))
  }

  const text = (field: 'income' | 'expenses' | 'age' | 'investmentAmount') => (event: ChangeEvent<HTMLInputElement>) =>
    update(field, event.target.value)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateProfile(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    storeValues(values)
    onSubmit(toAdviceRequest(values))
  }

  const currency = CURRENCY_BY_COUNTRY[values.country]
  const id = (name: string) => `${uid}-${name}`
  const describedBy = (name: ProfileField, hasHint = false) =>
    errors[name] ? id(`${name}-error`) : hasHint ? id(`${name}-hint`) : undefined

  return (
    <form className="card profile-form" onSubmit={handleSubmit} noValidate aria-labelledby={id('title')}>
      <h2 className="card-title" id={id('title')}>
        Your profile
      </h2>
      <p className="card-subtitle">Figures stay in your browser — only the values below are sent for analysis.</p>

      <Field id={id('income')} label="Monthly income" error={errors.income}>
        <input
          id={id('income')}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={values.income}
          onChange={text('income')}
          aria-invalid={Boolean(errors.income)}
          aria-describedby={describedBy('income')}
          autoComplete="off"
        />
      </Field>

      <Field id={id('expenses')} label="Monthly expenses" error={errors.expenses}>
        <input
          id={id('expenses')}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={values.expenses}
          onChange={text('expenses')}
          aria-invalid={Boolean(errors.expenses)}
          aria-describedby={describedBy('expenses')}
          autoComplete="off"
        />
      </Field>

      <Field id={id('age')} label="Age" error={errors.age}>
        <input
          id={id('age')}
          type="number"
          inputMode="numeric"
          min="18"
          max="100"
          step="1"
          value={values.age}
          onChange={text('age')}
          aria-invalid={Boolean(errors.age)}
          aria-describedby={describedBy('age')}
          autoComplete="off"
        />
      </Field>

      <fieldset className="field segmented-field" aria-describedby={errors.riskLevel ? id('riskLevel-error') : undefined}>
        <legend>Risk tolerance</legend>
        <div className="segmented" role="presentation">
          {RISK_OPTIONS.map((option) => (
            <div className="segment" key={option.value}>
              <input
                type="radio"
                name={id('risk')}
                id={id(`risk-${option.value}`)}
                value={option.value}
                checked={values.riskLevel === option.value}
                onChange={() => update('riskLevel', option.value)}
              />
              <label htmlFor={id(`risk-${option.value}`)} title={option.hint}>
                {option.label}
              </label>
            </div>
          ))}
        </div>
        {errors.riskLevel && (
          <p className="field-error" id={id('riskLevel-error')} role="alert">
            {errors.riskLevel}
          </p>
        )}
      </fieldset>

      <Field id={id('country')} label="Market" error={errors.country}>
        <select
          id={id('country')}
          value={values.country}
          onChange={(event) => update('country', event.target.value === 'IN' ? 'IN' : 'US')}
          aria-describedby={describedBy('country')}
        >
          <option value="US">United States (USD)</option>
          <option value="IN">India (INR)</option>
        </select>
      </Field>

      <Field id={id('topN')} label={`Number of holdings: ${values.topN}`} error={errors.topN}>
        <input
          id={id('topN')}
          type="range"
          min={TOP_N_MIN}
          max={TOP_N_MAX}
          step="1"
          value={values.topN}
          onChange={(event) => update('topN', Number(event.target.value))}
          aria-valuetext={`${values.topN} holdings`}
          aria-describedby={describedBy('topN')}
        />
      </Field>

      <Field
        id={id('investmentAmount')}
        label={`Investment amount (${currency}, optional)`}
        error={errors.investmentAmount}
        hint="Adds a currency amount to each holding"
      >
        <input
          id={id('investmentAmount')}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={values.investmentAmount}
          onChange={text('investmentAmount')}
          aria-invalid={Boolean(errors.investmentAmount)}
          aria-describedby={describedBy('investmentAmount', true)}
          autoComplete="off"
        />
      </Field>

      <button type="submit" className="btn btn-primary btn-block" disabled={loading} aria-busy={loading}>
        {loading && <span className="spinner" aria-hidden="true" />}
        {loading ? 'Analysing…' : 'Get recommendations'}
      </button>
    </form>
  )
}

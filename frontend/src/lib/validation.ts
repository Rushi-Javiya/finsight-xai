import type { AdviceRequest, Country, RiskLevel } from '../api/types'

export interface ProfileFormValues {
  income: string
  expenses: string
  age: string
  riskLevel: RiskLevel
  country: Country
  topN: number
  investmentAmount: string
}

export type ProfileField = 'income' | 'expenses' | 'age' | 'riskLevel' | 'country' | 'topN' | 'investmentAmount'
export type FormErrors = Partial<Record<ProfileField, string>>

export const TOP_N_MIN = 3
export const TOP_N_MAX = 15
export const AGE_MIN = 18
export const AGE_MAX = 100

export const DEFAULT_VALUES: ProfileFormValues = {
  income: '',
  expenses: '',
  age: '',
  riskLevel: 'MEDIUM',
  country: 'US',
  topN: 8,
  investmentAmount: '',
}

const parse = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text))

export function validateProfile(values: ProfileFormValues): FormErrors {
  const errors: FormErrors = {}

  const income = parse(values.income)
  if (values.income.trim() === '') errors.income = 'Monthly income is required'
  else if (!Number.isFinite(income) || income <= 0) errors.income = 'Income must be greater than 0'

  const expenses = parse(values.expenses)
  if (values.expenses.trim() === '') errors.expenses = 'Monthly expenses are required'
  else if (!Number.isFinite(expenses) || expenses < 0) errors.expenses = 'Expenses cannot be negative'

  const age = parse(values.age)
  if (values.age.trim() === '') errors.age = 'Age is required'
  else if (!Number.isInteger(age) || age < AGE_MIN || age > AGE_MAX) {
    errors.age = `Age must be a whole number between ${AGE_MIN} and ${AGE_MAX}`
  }

  if (!Number.isInteger(values.topN) || values.topN < TOP_N_MIN || values.topN > TOP_N_MAX) {
    errors.topN = `Choose between ${TOP_N_MIN} and ${TOP_N_MAX} holdings`
  }

  if (values.investmentAmount.trim() !== '') {
    const amount = parse(values.investmentAmount)
    if (!Number.isFinite(amount) || amount <= 0) errors.investmentAmount = 'Investment amount must be greater than 0'
  }

  return errors
}

export function toAdviceRequest(values: ProfileFormValues): AdviceRequest {
  const request: AdviceRequest = {
    income: Number(values.income),
    expenses: Number(values.expenses),
    age: Number(values.age),
    riskLevel: values.riskLevel,
    country: values.country,
    topN: values.topN,
  }
  if (values.investmentAmount.trim() !== '') request.investmentAmount = Number(values.investmentAmount)
  return request
}

const STORAGE_KEY = 'finsight.profile.v1'

export function loadStoredValues(storage: Pick<Storage, 'getItem'> = window.localStorage): ProfileFormValues {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_VALUES
    const stored = JSON.parse(raw) as Partial<ProfileFormValues>
    return {
      income: typeof stored.income === 'string' ? stored.income : DEFAULT_VALUES.income,
      expenses: typeof stored.expenses === 'string' ? stored.expenses : DEFAULT_VALUES.expenses,
      age: typeof stored.age === 'string' ? stored.age : DEFAULT_VALUES.age,
      riskLevel: stored.riskLevel === 'LOW' || stored.riskLevel === 'HIGH' ? stored.riskLevel : 'MEDIUM',
      country: stored.country === 'IN' ? 'IN' : 'US',
      topN: typeof stored.topN === 'number' ? stored.topN : DEFAULT_VALUES.topN,
      investmentAmount: typeof stored.investmentAmount === 'string' ? stored.investmentAmount : '',
    }
  } catch {
    return DEFAULT_VALUES
  }
}

export function storeValues(values: ProfileFormValues, storage: Pick<Storage, 'setItem'> = window.localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(values))
  } catch {
    // storage may be unavailable (private mode, quota); persistence is best-effort
  }
}

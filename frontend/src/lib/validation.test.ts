import { DEFAULT_VALUES, loadStoredValues, storeValues, toAdviceRequest, validateProfile } from './validation'
import type { ProfileFormValues } from './validation'

const valid: ProfileFormValues = {
  ...DEFAULT_VALUES,
  income: '5000',
  expenses: '3000',
  age: '30',
}

describe('validateProfile', () => {
  it('accepts a valid profile', () => {
    expect(validateProfile(valid)).toEqual({})
  })

  it('requires income, expenses and age', () => {
    const errors = validateProfile(DEFAULT_VALUES)
    expect(Object.keys(errors).sort()).toEqual(['age', 'expenses', 'income'])
  })

  it('rejects non-positive income and negative expenses but allows zero expenses', () => {
    expect(validateProfile({ ...valid, income: '0' }).income).toMatch(/greater than 0/)
    expect(validateProfile({ ...valid, expenses: '-1' }).expenses).toMatch(/negative/)
    expect(validateProfile({ ...valid, expenses: '0' }).expenses).toBeUndefined()
  })

  it('enforces the 18-100 whole-number age range', () => {
    expect(validateProfile({ ...valid, age: '17' }).age).toBeDefined()
    expect(validateProfile({ ...valid, age: '101' }).age).toBeDefined()
    expect(validateProfile({ ...valid, age: '30.5' }).age).toBeDefined()
    expect(validateProfile({ ...valid, age: '18' }).age).toBeUndefined()
    expect(validateProfile({ ...valid, age: '100' }).age).toBeUndefined()
  })

  it('enforces the holdings range', () => {
    expect(validateProfile({ ...valid, topN: 2 }).topN).toBeDefined()
    expect(validateProfile({ ...valid, topN: 16 }).topN).toBeDefined()
    expect(validateProfile({ ...valid, topN: 15 }).topN).toBeUndefined()
  })

  it('treats the investment amount as optional but positive', () => {
    expect(validateProfile({ ...valid, investmentAmount: '' }).investmentAmount).toBeUndefined()
    expect(validateProfile({ ...valid, investmentAmount: '0' }).investmentAmount).toBeDefined()
    expect(validateProfile({ ...valid, investmentAmount: 'abc' }).investmentAmount).toBeDefined()
    expect(validateProfile({ ...valid, investmentAmount: '10000' }).investmentAmount).toBeUndefined()
  })
})

describe('toAdviceRequest', () => {
  it('converts strings to numbers and omits an empty investment amount', () => {
    expect(toAdviceRequest(valid)).toEqual({
      income: 5000,
      expenses: 3000,
      age: 30,
      riskLevel: 'MEDIUM',
      country: 'US',
      topN: 8,
    })
  })

  it('includes the investment amount when provided', () => {
    expect(toAdviceRequest({ ...valid, investmentAmount: '10000', country: 'IN' })).toMatchObject({
      investmentAmount: 10000,
      country: 'IN',
    })
  })
})

describe('local storage persistence', () => {
  it('round-trips values', () => {
    const values: ProfileFormValues = { ...valid, riskLevel: 'HIGH', country: 'IN', topN: 12, investmentAmount: '2500' }
    storeValues(values)
    expect(loadStoredValues()).toEqual(values)
  })

  it('falls back to defaults for missing or corrupt data', () => {
    expect(loadStoredValues()).toEqual(DEFAULT_VALUES)
    window.localStorage.setItem('finsight.profile.v1', '{not json')
    expect(loadStoredValues()).toEqual(DEFAULT_VALUES)
  })

  it('sanitises unexpected stored values', () => {
    window.localStorage.setItem('finsight.profile.v1', JSON.stringify({ riskLevel: 'EXTREME', country: 'FR', income: 5 }))
    expect(loadStoredValues()).toEqual({ ...DEFAULT_VALUES, riskLevel: 'MEDIUM', country: 'US' })
  })

  it('does not throw when storage is unavailable', () => {
    const storage = { setItem: () => { throw new Error('quota') } }
    expect(() => storeValues(valid, storage)).not.toThrow()
  })
})

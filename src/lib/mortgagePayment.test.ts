import { describe, expect, it } from 'vitest'
import { PAYMENTS_PER_YEAR } from '../engine/home.ts'
import { MAX_MONTHLY_PAYMENT, maxPaymentPer } from './mortgagePayment.ts'
import { addHome } from './profileEdit.ts'
import { defaultProfile, validateProfile } from './schema.ts'

// The payment box's largest figure, the stored monthly payment, and the schema's own limit are one fact (lib/mortgagePayment.ts).

const withPayment = (monthlyPayment: number) => {
  const p = addHome(defaultProfile({ year: 2026 }))
  return { ...p, household: { ...p.household, home: { ...p.household.home!, mortgage: { ...p.household.home!.mortgage, monthlyPayment } } } }
}

describe('the mortgage payment limit', () => {
  it('is the schema’s own: the limit saves, a cent over it is refused', () => {
    expect(validateProfile(withPayment(MAX_MONTHLY_PAYMENT)).ok).toBe(true)
    expect(validateProfile(withPayment(MAX_MONTHLY_PAYMENT + 0.01)).ok).toBe(false)
  })

  it('whatever the frequency, the largest figure the box takes is stored within it — and it is the largest that is', () => {
    for (const perYear of Object.values(PAYMENTS_PER_YEAR)) {
      const top = maxPaymentPer(perYear)
      expect((top * perYear) / 12, String(perYear)).toBeLessThanOrEqual(MAX_MONTHLY_PAYMENT)
      expect(((top + 0.01) * perYear) / 12, String(perYear)).toBeGreaterThan(MAX_MONTHLY_PAYMENT - 0.01)
    }
    // weekly: about 230 769 $ a week, not the 1 000 000 that stored 4,3 M$ a month and refused every save after it
    expect(maxPaymentPer(52)).toBeCloseTo(230_769.23, 2)
  })
})

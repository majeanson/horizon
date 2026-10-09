import { describe, expect, it } from 'vitest'
import { EXAMPLES } from './golden/examples.ts'
import { PAYMENTS_PER_YEAR, amortizeYear, homeYear, initialHome, levelPayment, monthlyRate, monthsToPayoff, payoffMonths, payoffYear, termsAtRenewal } from './home.ts'
import { project } from './projection.ts'
import { retireAt } from './retireAt.ts'
import type { Home } from './types.ts'

// A MORTGAGE THAT ENDS, AND A HOUSE THAT IS WORTH SOMETHING. The arithmetic is the textbook one (a Canadian fixed-rate mortgage
// compounds semi-annually), so it is checked against the closed-form payment, not against itself; and the projection is held to
// what the household would feel: the cost stops the year the loan is paid, a sale frees exactly the equity, and a household with
// no home is untouched.

const { household: withMortgage, assumptions } = EXAMPLES.average
const base = { ...withMortgage, home: null } // the same couple, no home: the control
const home = (over: Partial<Home> = {}): Home => ({ value: 500_000, mortgage: { balance: 300_000, rate: 0.05, monthlyPayment: 1_745 }, sale: null, ...over })
const withHome = (h: Home | null) => ({ ...base, home: h })

describe('the mortgage arithmetic', () => {
  it('the monthly rate of a Canadian fixed-rate mortgage compounds the annual rate semi-annually', () => {
    expect(monthlyRate(0.05)).toBeCloseTo(1.025 ** (1 / 6) - 1, 12)
    expect((1 + monthlyRate(0.05)) ** 12).toBeCloseTo(1.025 ** 2, 10) // twelve months = two half-years at 2,5 %
    expect(monthlyRate(0)).toBe(0)
  })

  it('300 000 $ at 5 % over 25 years costs the closed-form payment, and that payment pays it off in exactly 300 months', () => {
    const i = monthlyRate(0.05)
    const payment = (300_000 * i) / (1 - (1 + i) ** -300)
    expect(payment).toBeGreaterThan(1_744)
    expect(payment).toBeLessThan(1_746)
    expect(monthsToPayoff(300_000, 0.05, payment)).toBe(300)
    // one dollar less a month and it takes longer; a payment that does not cover the interest never pays it off
    expect(monthsToPayoff(300_000, 0.05, payment - 1)!).toBeGreaterThan(300)
    expect(monthsToPayoff(300_000, 0.05, 300_000 * i)).toBeNull()
    expect(monthsToPayoff(300_000, 0.05, 0)).toBeNull()
    expect(monthsToPayoff(0, 0.05, 0)).toBe(0)
  })

  it('the payoff year agrees with the projection: the year the balance first reaches zero in the plan is the year the last payment falls in', () => {
    const months = monthsToPayoff(150_000, 0.049, 1_150)!
    const rows = project(withHome(home({ mortgage: { balance: 150_000, rate: 0.049, monthlyPayment: 1_150 } })), assumptions)
    expect(rows.find((r) => r.household.mortgageBalanceEnd === 0)!.year).toBe(payoffYear(assumptions.today.year, months))
    expect(payoffYear(2026, 12)).toBe(2026) // twelve payments: the first year
    expect(payoffYear(2026, 13)).toBe(2027)
  })

  it('a year of payments: interest first, the balance falls, the last year pays only what is owed', () => {
    const y1 = amortizeYear(300_000, 0.05, 1_745)
    expect(y1.paid).toBeCloseTo(12 * 1_745, 6)
    expect(y1.balance).toBeLessThan(300_000)
    expect(300_000 - y1.balance).toBeLessThan(y1.paid) // some of it was interest
    const last = amortizeYear(5_000, 0.05, 1_745)
    expect(last.balance).toBe(0)
    expect(last.paid).toBeLessThan(5_100) // 5 000 $ plus a few months of interest, not twelve payments
    expect(amortizeYear(0, 0.05, 1_745)).toEqual({ paid: 0, balance: 0 })
    expect(amortizeYear(100_000, 0.05, 100).balance).toBeGreaterThan(100_000) // under the interest: it grows
  })
})

describe('the house through the years', () => {
  it('with no home, nothing changes: no payment, no value, and the same spending as ever', () => {
    const none = project(withHome(null), assumptions)
    const { home: _gone, ...noKey } = withMortgage
    const absent = project(noKey, assumptions) // not even the key
    expect(none).toEqual(absent)
    for (const r of none) expect([r.household.mortgagePayment, r.household.homeValueEnd, r.household.mortgageBalanceEnd]).toEqual([0, 0, 0])
  })

  it('the payment is part of what the household pays while the loan runs, and stops the year it is paid off', () => {
    const plain = project(withHome(null), assumptions)
    const owing = project(withHome(home()), assumptions)
    const paidOff = owing.find((r) => r.household.mortgageBalanceEnd === 0)!
    expect(paidOff.year - assumptions.today.year).toBeGreaterThan(20) // ~25 years from a 300 000 $ balance at 1 745 $ a month
    expect(paidOff.year - assumptions.today.year).toBeLessThan(26)
    owing.forEach((r, i) => {
      if (r.year < paidOff.year) expect(r.household.mortgagePayment, `${r.year}`).toBeCloseTo(12 * 1_745, 2)
      // the spending is the plain spending plus the payment — to the cent — and after payoff, the plain spending
      expect(r.household.spending - plain[i].household.spending, `${r.year}`).toBeCloseTo(r.household.mortgagePayment, 1)
      if (r.year > paidOff.year) {
        expect(r.household.mortgagePayment).toBe(0)
        expect(r.household.mortgageBalanceEnd).toBe(0)
      }
    })
    // the balance only falls
    for (let i = 1; i < owing.length; i++) expect(owing[i].household.mortgageBalanceEnd).toBeLessThanOrEqual(owing[i - 1].household.mortgageBalanceEnd + 0.01)
  })

  it('the home keeps its real value: it grows with inflation, and is shown beside — not inside — the net worth', () => {
    const rows = project(withHome(home({ mortgage: { balance: 0, rate: 0, monthlyPayment: 0 } })), assumptions)
    expect(rows[0].household.homeValueEnd).toBeCloseTo(500_000 * (1 + assumptions.inflation), 0)
    const last = rows[rows.length - 1]
    expect(last.household.homeValueEnd / (1 + assumptions.inflation) ** (last.year - assumptions.today.year + 1)).toBeCloseTo(500_000, -2)
    // a home owned outright costs nothing and moves nothing in the accounts
    const plain = project(withHome(null), assumptions)
    expect(rows.map((r) => r.household.netWorthEnd)).toEqual(plain.map((r) => r.household.netWorthEnd))
  })

  it('a sale frees exactly the equity (less the replacement) into the first person’s non-registered account, once', () => {
    const sale = { age: 70, replacementCost: 200_000 }
    const h = home({ value: 600_000, mortgage: { balance: 0, rate: 0, monthlyPayment: 0 }, sale })
    const rows = project(withHome(h), assumptions)
    const plain = project(withHome(null), assumptions)
    const firstBorn = base.persons[0].birth.year
    const saleYear = firstBorn + 70
    const idx = rows.findIndex((r) => r.year === saleYear)
    const inflate = (1 + assumptions.inflation) ** (saleYear - assumptions.today.year)
    const equity = 600_000 * inflate
    const released = equity - 200_000 * inflate
    // before the sale: no difference; the sale year: the non-registered balances differ by about what was released (one year's growth on top)
    expect(rows[idx - 1].household.netWorthEnd).toBeCloseTo(plain[idx - 1].household.netWorthEnd, 0)
    const gain = rows[idx].household.netWorthEnd - plain[idx].household.netWorthEnd
    expect(gain).toBeGreaterThan(released * 0.98)
    expect(gain).toBeLessThan(released * 1.1)
    // after it the home is the smaller one, still keeping its real value
    expect(rows[idx].household.homeValueEnd).toBeCloseTo(200_000 * inflate * (1 + assumptions.inflation), 0)
    expect(rows[idx + 1].household.homeValueEnd).toBeCloseTo(rows[idx].household.homeValueEnd * (1 + assumptions.inflation), 0)
  })

  it('a replacement dearer than the equity is paid for out of that year’s spending, and the loan is cleared by the sale', () => {
    const state = initialHome(home({ value: 400_000, mortgage: { balance: 250_000, rate: 0.05, monthlyPayment: 1_500 }, sale: { age: 50, replacementCost: 600_000 } }))
    const step = homeYear(state, home({ value: 400_000, mortgage: { balance: 250_000, rate: 0.05, monthlyPayment: 1_500 }, sale: { age: 50, replacementCost: 600_000 } }), 50, 0.02, 1)
    expect(step.released).toBe(0)
    expect(step.extraNeed).toBeCloseTo(600_000 - (400_000 - 250_000), 6)
    expect(step.balanceEnd).toBe(0)
    expect(step.payment).toBe(0) // nothing owed after the sale
    // and the sale happens once
    const again = homeYear(step.next, home({ sale: { age: 50, replacementCost: 600_000 } }), 51, 0.02, 1.02)
    expect(again.released + again.extraNeed).toBe(0)
  })

  it('a mortgage never makes the earliest retirement age earlier, and the same loan with a bigger payment ends sooner', () => {
    const e = (h: Home | null) => retireAt(withHome(h), assumptions, { stopAtFirstOk: true }).earliestOk
    const none = e(null)!
    const owing = e(home())
    expect(owing === null || owing >= none).toBe(true)
    const slow = project(withHome(home({ mortgage: { balance: 300_000, rate: 0.05, monthlyPayment: 1_745 } })), assumptions).find((r) => r.household.mortgageBalanceEnd === 0)!.year
    const fast = project(withHome(home({ mortgage: { balance: 300_000, rate: 0.05, monthlyPayment: 2_500 } })), assumptions).find((r) => r.household.mortgageBalanceEnd === 0)!.year
    expect(fast).toBeLessThan(slow)
  })
})

describe('a renewal: the rate changes at the end of a term', () => {
  const mortgage = (renewal: NonNullable<Home['mortgage']['renewal']> | null) => ({ balance: 266_000, rate: 0.0389, monthlyPayment: 1_761.11, renewal })
  const FROM = 2026

  it('without a renewal nothing changes: the payoff is the one the payment alone gives', () => {
    expect(payoffMonths(mortgage(null), FROM)).toBe(monthsToPayoff(266_000, 0.0389, 1_761.11))
    expect(payoffMonths({ balance: 0, rate: 0.05, monthlyPayment: 0 }, FROM)).toBe(0)
  })

  it('a level payment pays the balance off in exactly the months it was worked out for', () => {
    const p = levelPayment(266_000, 0.0389, 207)
    expect(monthsToPayoff(266_000, 0.0389, p)).toBe(207)
    expect(levelPayment(120_000, 0, 120)).toBe(1_000)
  })

  it('keeping the PAYMENT at a higher rate moves the payoff later; at a lower rate, sooner', () => {
    const plain = payoffMonths(mortgage(null), FROM)!
    const dearer = payoffMonths(mortgage({ year: 2029, rate: 0.055, keep: 'payment' }), FROM)!
    const cheaper = payoffMonths(mortgage({ year: 2029, rate: 0.025, keep: 'payment' }), FROM)!
    expect(dearer).toBeGreaterThan(plain)
    expect(cheaper).toBeLessThan(plain)
  })

  it('keeping the PAYOFF DATE at a higher rate moves the payment up instead, and the date stays', () => {
    const plain = payoffMonths(mortgage(null), FROM)!
    const kept = payoffMonths(mortgage({ year: 2029, rate: 0.055, keep: 'amortization' }), FROM)!
    expect(Math.abs(kept - plain)).toBeLessThanOrEqual(1)
    // the payment the plan then pays is higher than the one before the renewal
    const m = mortgage({ year: 2029, rate: 0.055, keep: 'amortization' })
    let state = initialHome({ value: 650_000, mortgage: m, sale: null })
    const paid: number[] = []
    for (let y = FROM; y < 2032; y++) {
      const step = homeYear(state, { value: 650_000, mortgage: m, sale: null }, 40, 0.02, 1, y)
      paid.push(step.payment)
      state = step.next
    }
    expect(paid[0]).toBeCloseTo(1_761.11 * 12, 0)
    expect(paid[2]).toBeCloseTo(1_761.11 * 12, 0) // 2028: still the old terms
    expect(paid[3]).toBeGreaterThan(paid[2]) // 2029: the renewal
  })

  it('the date shown and the plan agree: the year the plan\'s balance reaches zero is the year the last payment falls in, with a renewal too', () => {
    for (const keep of ['payment', 'amortization'] as const) {
      const m = mortgage({ year: 2030, rate: 0.06, keep })
      const hm: Home = { value: 650_000, mortgage: m, sale: null }
      let state = initialHome(hm)
      let zeroAt: number | null = null
      for (let y = FROM; y < FROM + 50 && zeroAt === null; y++) {
        const step = homeYear(state, hm, 40, 0.02, 1, y)
        state = step.next
        if (step.balanceEnd === 0) zeroAt = y
      }
      expect(zeroAt, keep).toBe(payoffYear(FROM, payoffMonths(m, FROM)!))
    }
  })

  it('a renewal that was in the past is ignored, and a payment that cannot cover the new rate never pays off', () => {
    expect(payoffMonths(mortgage({ year: 2020, rate: 0.09, keep: 'payment' }), FROM)).toBe(payoffMonths(mortgage(null), FROM))
    expect(payoffMonths({ balance: 266_000, rate: 0.0389, monthlyPayment: 1_000, renewal: { year: 2028, rate: 0.12, keep: 'payment' } }, FROM)).toBeNull()
  })

  it('a household with no renewal is untouched by the feature: the plan is the same as with the field absent', () => {
    const a = project(withHome(home()), assumptions)
    const b = project(withHome(home({ mortgage: { balance: 300_000, rate: 0.05, monthlyPayment: 1_745, renewal: null, frequency: 'monthly' } })), assumptions)
    expect(b).toEqual(a)
  })

  it('a payment counted in another unit is the same payment: 26 fortnightly payments are 12 monthly ones of 26 ÷ 12 the size', () => {
    expect(PAYMENTS_PER_YEAR).toEqual({ monthly: 12, biweekly: 26, weekly: 52 })
    expect((812.82 * PAYMENTS_PER_YEAR.biweekly) / 12).toBeCloseTo(1_761.11, 2)
  })
})

describe('what the terms become at a renewal', () => {
  const m = (renewal: NonNullable<Home['mortgage']['renewal']> | null) => ({ balance: 266_000, rate: 0.0389, monthlyPayment: 1_761.11, renewal })

  it('nothing without a renewal, and nothing when the loan is paid off before it', () => {
    expect(termsAtRenewal(m(null), 2026)).toBeNull()
    expect(termsAtRenewal({ balance: 20_000, rate: 0.05, monthlyPayment: 2_000, renewal: { year: 2040, rate: 0.06, keep: 'payment' } }, 2026)).toBeNull()
  })

  it('at the start year the balance is today\'s; keeping the date raises the payment at a higher rate, keeping the payment leaves it', () => {
    const now = termsAtRenewal(m({ year: 2026, rate: 0.055, keep: 'amortization' }), 2026)!
    expect(now.balance).toBeCloseTo(266_000, 2)
    expect(now.payment).toBeGreaterThan(1_761.11)
    expect(termsAtRenewal(m({ year: 2026, rate: 0.055, keep: 'payment' }), 2026)!.payment).toBe(1_761.11)
  })

  it('three years in, less is owed, and the new payment still pays the rest off by the old date', () => {
    const at = termsAtRenewal(m({ year: 2029, rate: 0.055, keep: 'amortization' }), 2026)!
    expect(at.balance).toBeLessThan(266_000)
    const oldDate = monthsToPayoff(266_000, 0.0389, 1_761.11)!
    expect(monthsToPayoff(at.balance, 0.055, at.payment)! + 36).toBeCloseTo(oldDate, 0)
  })
})

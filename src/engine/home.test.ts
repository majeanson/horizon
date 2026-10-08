import { describe, expect, it } from 'vitest'
import { EXAMPLES } from './golden/examples.ts'
import { amortizeYear, homeYear, initialHome, monthlyRate, monthsToPayoff, payoffYear } from './home.ts'
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

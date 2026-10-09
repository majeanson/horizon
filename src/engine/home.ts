import type { Home } from './types.ts'

// THE HOME: a mortgage that ends, and a house that is worth something.
//
// Two things a flat « dépenses » figure cannot say. (1) The mortgage payment is a cost with an END: while it runs it is part of
// what the household must pay, and the year it is paid off that cost simply stops — so the figure for « spending in
// retirement » never has to carry it for life (or leave it out for the years it runs). (2) The house is wealth the accounts do
// not show: its equity (value less what is still owed) is reported beside the net worth — illiquid, never drawn on — and is
// released only by a SALE or a downsizing the person has chosen.
//
// What is modelled, and what is not:
//   · The payment is the person's own figure (their statement says it); nothing is computed about penalties or a variable rate.
//     It is paid monthly, 12 times a year, in nominal dollars (a mortgage payment is not indexed). A RENEWAL, when the person states
//     one, is one change of rate from January of a year: the payment then either stays (the payoff moves) or is recomputed to keep
//     the payoff date. Nothing is guessed about a renewal the person did not state.
//   · Interest follows the Canadian fixed-rate convention: the stated annual rate is compounded SEMI-ANNUALLY (Interest Act,
//     s. 6), so the monthly rate is (1 + rate/2)^(1/6) − 1. The last payment is whatever is still owed.
//   · The house's value grows with INFLATION (its real value stays put): a stated simplification, not a forecast.
//   · A sale (at the age the FIRST person reaches) turns the equity into money: it pays the mortgage off, buys a replacement
//     home (`replacementCost`, today's dollars; 0 = rent) and puts the rest in the first person's non-registered account.
//     A principal residence's gain is not taxed here. A replacement dearer than the equity is paid for out of that year's
//     spending instead.

/** Where the house stands at the START of a year. `rate` and `payment` are the mortgage's terms now (a renewal changes them). */
export interface HomeState {
  value: number
  balance: number
  sold: boolean
  rate: number
  payment: number
}

export const initialHome = (home: Home): HomeState => ({ value: home.value, balance: home.mortgage.balance, sold: false, rate: home.mortgage.rate, payment: home.mortgage.monthlyPayment })

/** The monthly rate of a Canadian fixed-rate mortgage: the annual rate is compounded semi-annually. */
export const monthlyRate = (annualRate: number): number => (annualRate <= 0 ? 0 : (1 + annualRate / 2) ** (1 / 6) - 1)

/**
 * The calendar year the last payment falls in, given `months` payments counted from January of `fromYear` — the projection's own
 * convention (a year is whole: the current year already holds twelve payments), so this date and the plan's table agree.
 */
export const payoffYear = (fromYear: number, months: number): number => fromYear + Math.floor((Math.max(1, months) - 1) / 12)

/** How many payments a year each frequency makes. */
export const PAYMENTS_PER_YEAR = { monthly: 12, biweekly: 26, weekly: 52 } as const

/** The payment that pays `balance` off in exactly `months` monthly payments at this rate (the last one may differ by a cent). */
export function levelPayment(balance: number, annualRate: number, months: number): number {
  if (months <= 0) return balance
  const i = monthlyRate(annualRate)
  return i === 0 ? balance / months : (balance * i) / (1 - (1 + i) ** -months)
}

/**
 * The terms in force from a renewal: the new rate, and the payment — kept, or recomputed to pay the balance off when it would have been. A payment that
 * could never have paid the balance off has no payoff date to keep, so it is kept as it is.
 */
export function renewed(balance: number, rate: number, payment: number, renewal: NonNullable<NonNullable<Home['mortgage']['renewal']>>): { rate: number; payment: number } {
  if (renewal.keep === 'payment') return { rate: renewal.rate, payment }
  const left = monthsToPayoff(balance, rate, payment)
  return { rate: renewal.rate, payment: left === null || left <= 0 ? payment : levelPayment(balance, renewal.rate, left) }
}

/** Twelve monthly payments: what is paid over the year, and what is still owed after. A payment under the interest lets the balance grow. */
export function amortizeYear(balance: number, annualRate: number, monthlyPayment: number): { paid: number; balance: number } {
  const i = monthlyRate(annualRate)
  let owed = balance
  let paid = 0
  for (let month = 0; month < 12 && owed > 0.005; month++) {
    const interest = owed * i
    const pay = Math.min(monthlyPayment, owed + interest)
    owed = owed + interest - pay
    paid += pay
  }
  return { paid, balance: owed < 0.005 ? 0 : owed }
}

/**
 * Months until the mortgage is paid off at this payment, or null when it never is (the payment does not cover the interest, or
 * is zero while something is owed). 0 when nothing is owed. Capped at fifty years: a mortgage that long is not one.
 */
export function monthsToPayoff(balance: number, annualRate: number, monthlyPayment: number): number | null {
  if (balance <= 0.005) return 0
  const i = monthlyRate(annualRate)
  if (monthlyPayment <= balance * i + 1e-9) return null
  let owed = balance
  for (let month = 1; month <= 600; month++) {
    owed = owed * (1 + i) - monthlyPayment
    if (owed <= 0.005) return month
  }
  return null
}

/**
 * Months until the mortgage is paid off from January of `fromYear`, counting a stated renewal, or null when it never is (a payment under the interest, before or after
 * the renewal). The same month-by-month arithmetic the projection runs a year at a time, so the date shown and the plan's table agree.
 */
export function payoffMonths(mortgage: Home['mortgage'], fromYear: number): number | null {
  if (mortgage.balance <= 0.005) return 0
  let owed = mortgage.balance
  let rate = mortgage.rate
  let payment = mortgage.monthlyPayment
  const renewal = mortgage.renewal ?? null
  for (let month = 0; month < 600; month++) {
    if (renewal !== null && month % 12 === 0 && fromYear + month / 12 === renewal.year) ({ rate, payment } = renewed(owed, rate, payment, renewal))
    const i = monthlyRate(rate)
    if (payment <= owed * i + 1e-9) return null
    owed = owed * (1 + i) - Math.min(payment, owed * (1 + i))
    if (owed <= 0.005) return month + 1
  }
  return null
}

/**
 * What is owed and the terms in force from the renewal, counted from January of `fromYear`: null when there is no renewal to come, or the mortgage is paid off before it.
 * It is how the screen says what the payment becomes — the same arithmetic the plan runs.
 */
export function termsAtRenewal(mortgage: Home['mortgage'], fromYear: number): { balance: number; rate: number; payment: number } | null {
  const renewal = mortgage.renewal ?? null
  if (renewal === null || renewal.year < fromYear || mortgage.balance <= 0.005) return null
  let owed = mortgage.balance
  for (let month = 0; month < (renewal.year - fromYear) * 12; month++) {
    const i = monthlyRate(mortgage.rate)
    owed = owed * (1 + i) - Math.min(mortgage.monthlyPayment, owed * (1 + i))
    if (owed <= 0.005) return null
  }
  return { balance: owed, ...renewed(owed, mortgage.rate, mortgage.monthlyPayment, renewal) }
}

export interface HomeYear {
  /** Paid on the mortgage this year. */
  payment: number
  /** Money released into the first person's non-registered account by a sale this year (never negative). */
  released: number
  /** What a replacement home costs beyond the equity, to be met out of this year's spending (never negative). */
  extraNeed: number
  /** At the END of the year. */
  valueEnd: number
  balanceEnd: number
  next: HomeState
}

/**
 * One year of the house. `ageOfFirst` is the first person's age this year (the sale's trigger); `inflate` is this year's price
 * index against today (the replacement home is priced in today's dollars); `inflation` grows the value to the year's end.
 */
export function homeYear(state: HomeState, home: Home, ageOfFirst: number, inflation: number, inflate: number, year?: number): HomeYear {
  let { value, balance, sold, rate, payment } = state
  let released = 0
  let extraNeed = 0
  if (home.sale !== null && !sold && ageOfFirst >= home.sale.age) {
    const equity = value - balance
    const replacement = home.sale.replacementCost * inflate
    const delta = equity - replacement
    if (delta >= 0) released = delta
    else extraNeed = -delta
    value = replacement
    balance = 0
    sold = true
  }
  // A stated renewal takes effect in January of its year, on whatever is then owed.
  const renewal = home.mortgage.renewal ?? null
  if (renewal !== null && year !== undefined && year === renewal.year && balance > 0.005) ({ rate, payment } = renewed(balance, rate, payment, renewal))
  const m = amortizeYear(balance, rate, payment)
  const valueEnd = value * (1 + inflation)
  return { payment: m.paid, released, extraNeed, valueEnd, balanceEnd: m.balance, next: { value: valueEnd, balance: m.balance, sold, rate, payment } }
}

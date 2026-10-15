import type { Fact } from './facts.ts'
import type { Profile } from './schema.ts'

// WHAT A FACT HOLDS, for a page that restates it outside the form: the printed plan's « Les chiffres du profil », the list a planner reads to check the
// answer against the household's own documents. The value as the form holds it (today's dollars, nominal), never re-computed.

export type FactValue =
  | { kind: 'money'; amount: number }
  | { kind: 'years'; count: number }
  | { kind: 'since'; year: number }
  | { kind: 'plans'; count: number }

export function factValue(p: Profile, f: Fact): FactValue {
  const person = p.household.persons.find((x) => x.id === f.owner)
  const money = (amount: number | undefined): FactValue => ({ kind: 'money', amount: amount ?? 0 })
  switch (f.kind) {
    case 'salary':
      return money(person?.salaryToday)
    case 'earnings':
      // The relevé's lines typed so far: a planner reads « 27 années », not a total that mixes dollars of thirty different years.
      return { kind: 'years', count: Object.keys(person?.earningsHistory ?? {}).length }
    case 'residence':
      return { kind: 'since', year: person?.oas.residentSince ?? 0 }
    case 'rrspBalance':
      return money(person?.accounts.rrsp.balance)
    case 'rrspRoom':
      return money(person?.accounts.rrsp.room)
    case 'rrspLocked':
      return money(person?.accounts.rrsp.lockedIn)
    case 'tfsaBalance':
      return money(person?.accounts.tfsa.balance)
    case 'tfsaRoom':
      return money(person?.accounts.tfsa.room)
    case 'nonRegBalance':
      return money(person?.accounts.nonReg.balance)
    case 'nonRegAcb':
      return money(person?.accounts.nonReg.acb)
    case 'pension':
      return { kind: 'plans', count: person?.pensions.length ?? 0 }
    case 'spendingWorking':
      return money(p.household.spending.workingToday)
    case 'spendingRetired':
      return money(p.household.spending.retiredToday)
    case 'homeValue':
      return money(p.household.home?.value)
    case 'mortgage':
      return money(p.household.home?.mortgage.balance)
  }
}

import { describe, expect, it } from 'vitest'
import { exampleProfile } from './example.ts'
import { factsOf } from './facts.ts'
import { factValue } from './factValue.ts'
import { addHome } from './profileEdit.ts'

// The printed plan's « Les chiffres du profil » restates each figure as the profile holds it — never re-computed, never a different number.

describe('what a fact holds', () => {
  it('restates every figure of a household exactly as the form holds it', () => {
    const p = addHome(exampleProfile('golden'))
    const [self] = p.household.persons
    for (const f of factsOf(p)) {
      const v = factValue(p, f)
      if (f.owner === self.id && f.kind === 'rrspBalance') expect(v).toEqual({ kind: 'money', amount: self.accounts.rrsp.balance })
      if (f.owner === self.id && f.kind === 'tfsaRoom') expect(v).toEqual({ kind: 'money', amount: self.accounts.tfsa.room })
      if (f.owner === self.id && f.kind === 'earnings') expect(v).toEqual({ kind: 'years', count: Object.keys(self.earningsHistory).length })
      if (f.kind === 'spendingRetired') expect(v).toEqual({ kind: 'money', amount: p.household.spending.retiredToday })
      if (f.kind === 'homeValue') expect(v).toEqual({ kind: 'money', amount: p.household.home!.value })
      // nothing comes back empty or not a number
      if (v.kind === 'money') expect(Number.isFinite(v.amount), f.id).toBe(true)
    }
  })
})

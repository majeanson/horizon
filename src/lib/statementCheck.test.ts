import { describe, expect, it } from 'vitest'
import { GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import type { Person } from '../engine/types.ts'
import { STATEMENT_CHECK_COPY } from './statementCheckCopy.ts'
import { SAME_WITHIN, statementLine } from './statementCheck.ts'

// The typed « Montant actuel » beside the calculation's: null until there is something to check, the same figure within the relevé's own rounding, and otherwise by how much.

const NOW = 2026
const person = (statement: { statementAt60?: number; statementAt65?: number }): Person => {
  const p = structuredClone(GOLDEN_HOUSEHOLD.persons[0])
  p.rrq = { ...p.rrq, ...statement }
  return p
}

describe('the line under a typed figure', () => {
  it('is null while nothing is typed for that age, or typed as zero', () => {
    expect(statementLine(person({}), 65, NOW)).toBeNull()
    expect(statementLine(person({ statementAt65: 0 }), 65, NOW)).toBeNull()
    expect(statementLine(person({ statementAt65: 988 }), 60, NOW)).toBeNull() // the other age
  })

  it('is null when no earnings are entered: there is nothing to calculate from', () => {
    const p = person({ statementAt65: 988 })
    p.earningsHistory = {}
    expect(statementLine(p, 65, NOW)).toBeNull()
  })

  it('the relevé\'s own figure, rounded to the dollar, is the same figure', () => {
    const l = statementLine(person({ statementAt65: 988 }), 65, NOW)! // the calculation gives 988,12
    expect(l.same).toBe(true)
    expect(l.engine).toBeCloseTo(988.12, 2)
    expect(Math.abs(l.diff)).toBeLessThanOrEqual(SAME_WITHIN)
  })

  it('a figure further off says by how much, which way, and as a share of the relevé\'s', () => {
    const lower = statementLine(person({ statementAt65: 1100 }), 65, NOW)!
    expect(lower.same).toBe(false)
    expect(lower.diff).toBeCloseTo(988.12 - 1100, 2)
    expect(lower.share).toBeCloseTo((1100 - 988.12) / 1100, 4)
    const higher = statementLine(person({ statementAt65: 900 }), 65, NOW)!
    expect(higher.diff).toBeGreaterThan(0)
  })

  it('just over a dollar is a difference, and a dollar is not', () => {
    expect(statementLine(person({ statementAt65: 987 }), 65, NOW)!.same).toBe(false) // 1,12 off
    expect(statementLine(person({ statementAt65: 989 }), 65, NOW)!.same).toBe(true) // 0,88 off
  })
})

describe('the words', () => {
  it('say the figures they are given, in both languages', () => {
    for (const lang of ['fr', 'en'] as const) {
      const c = STATEMENT_CHECK_COPY[lang]
      expect(c.same('E')).toContain('E')
      for (const f of [c.higher, c.lower]) for (const part of ['E', 'D', 'S']) expect(f('E', 'D', 'S')).toContain(part)
      expect(c.method.trim()).not.toBe('')
      expect(c.check.trim()).not.toBe('')
    }
    expect(STATEMENT_CHECK_COPY.fr.method).not.toBe(STATEMENT_CHECK_COPY.en.method)
  })
})

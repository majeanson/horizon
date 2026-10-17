import { describe, expect, it } from 'vitest'
import { KNOWN } from '../engine/params/index'
import { citedLeaves } from '../engine/params/cited'
import type { Household } from '../engine/types'
import { familyOf, figuresUsed } from './figuresUsed'

const person = (id: string) => ({ id }) as unknown as Household['persons'][number]
const alone = { persons: [person('a')], livesAlone: true } as unknown as Household
const couple = { persons: [person('a'), person('b')] } as unknown as Household
const rows = citedLeaves(KNOWN[2026]).map(({ path }) => ({ path }))
const paths = (h: Household, retiredNow = false) => figuresUsed(rows, { household: h, retiredNow }).kept.map((r) => r.path)

describe('figuresUsed', () => {
  it('leaves out only what the profile says does not apply, and nothing else', () => {
    const kept = paths(alone)
    expect(kept.length).toBeLessThan(rows.length)
    expect(kept.length).toBeGreaterThan(rows.length / 2)
    for (const p of kept) expect(familyOf(p) === null || familyOf(p) === 'alone' || familyOf(p) === 'work').toBe(true)
  })

  it('a single person with no children drops children, survivor and couple figures, keeps living-alone and payroll', () => {
    const kept = paths(alone)
    expect(kept).not.toContain('childBenefits.ccb.maxUnder6')
    expect(kept).not.toContain('rrq.survivorMax65')
    expect(kept).not.toContain('oas.gis.spouseOas.max')
    expect(kept).toContain('quebec.livingAloneAmount')
    expect(kept).toContain('payroll.eiRate')
    expect(kept).toContain('oas.gis.single.max')
  })

  it('a couple with children keeps survivor, couple and children figures, and drops the living-alone amount', () => {
    const kept = paths({ ...couple, children: [2020] })
    expect(kept).toContain('rrq.survivorMax65')
    expect(kept).toContain('oas.gis.spouseOas.max')
    expect(kept).toContain('childBenefits.ccb.maxUnder6')
    expect(kept).not.toContain('quebec.livingAloneAmount')
  })

  it('a household that counts the child benefits keeps them even without a child yet listed', () => {
    expect(paths({ ...alone, kidsEffects: { benefits: true, qppExclusion: false, leave: null } })).toContain('childBenefits.ccb.maxUnder6')
  })

  it('once everyone has retired no payroll figure is read', () => {
    expect(paths(alone, true)).not.toContain('payroll.eiRate')
  })

  it('names each family left out once, with the rows it took, and the counts add up', () => {
    const { kept, left } = figuresUsed(rows, { household: alone, retiredNow: false })
    expect(new Set(left.map((l) => l.family)).size).toBe(left.length)
    expect(kept.length + left.reduce((n, l) => n + l.count, 0)).toBe(rows.length)
  })
})

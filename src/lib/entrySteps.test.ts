import { describe, expect, it } from 'vitest'
import { DOC_IDS, factsOf } from './facts.ts'
import { exampleProfile } from './example.ts'
import { ENTRY_STEPS, stepById, stepFactIds, stepProgress } from './entrySteps.ts'

// « SAISIE PAR DOCUMENT »: the steps are the profile's own documents, so every figure the profile uses is in exactly one step.

describe('the steps of the entry', () => {
  it('start with who the household is, then every document once, in the checklist’s order', () => {
    expect(ENTRY_STEPS.map((s) => s.id)).toEqual(['you', ...DOC_IDS])
    expect(ENTRY_STEPS[0].doc).toBeNull()
    expect(new Set(ENTRY_STEPS.map((s) => s.id)).size).toBe(ENTRY_STEPS.length)
  })

  it('an unknown or missing step is the first', () => {
    expect(stepById(null).id).toBe('you')
    expect(stepById('nope').id).toBe('you')
    expect(stepById('bank').doc).toBe('bank')
  })

  it('every figure of a real household is read in exactly one step', () => {
    for (const id of ['golden', 'average', 'heir'] as const) {
      const profile = exampleProfile(id)
      const all = factsOf(profile).map((f) => f.id)
      const seen = ENTRY_STEPS.flatMap((s) => stepFactIds(s, profile))
      expect([...seen].sort(), id).toEqual([...all].sort())
      expect(new Set(seen).size, id).toBe(seen.length)
    }
  })

  it('counts what is confirmed in a step, and nothing in the first', () => {
    const p = exampleProfile('golden')
    const bank = stepById('bank')
    const ids = stepFactIds(bank, p)
    expect(ids.length).toBeGreaterThan(0)
    expect(stepProgress(bank, p)).toEqual({ confirmed: 0, total: ids.length })
    expect(stepProgress(bank, { ...p, confirmed: ids.slice(0, 2) })).toEqual({ confirmed: 2, total: ids.length })
    expect(stepProgress(stepById('you'), p)).toEqual({ confirmed: 0, total: 0 })
  })
})

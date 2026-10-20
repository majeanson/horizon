import { describe, expect, it } from 'vitest'
import type { Flow } from '../engine/types.ts'
import { addFlow, confirmFlow, keepFlowByLabel, removeFlow, updateFlow } from './profileLife.ts'
import { MAX_FLOWS, defaultProfile, validateProfile, type Profile } from './schema.ts'

// THE EDITS OF A DATED EVENT, and what they do to the word « estimé »: an amount typed over makes the figure the person's own, nothing else does, and
// « Confirmer ce montant » keeps it. A saved profile never carries `estimate: undefined`.

const flow = (patch: Partial<Flow> = {}): Flow => ({ label: 'Entretien', kind: 'expense', amount: 1667, fromYear: 2026, toYear: 2080, owner: 'self', taxable: false, estimate: 'upkeep', ...patch })
const withFlows = (...flows: Flow[]): Profile => flows.reduce((p, f) => addFlow(p, f), defaultProfile({ year: 2026 }))
const only = (p: Profile): Flow => p.household.flows![0]

describe('an event added from a starting point', () => {
  it('keeps its estimate', () => {
    expect(only(withFlows(flow())).estimate).toBe('upkeep')
  })

  it('an event the person writes from nothing carries none', () => {
    const { estimate: _estimate, ...own } = flow()
    expect('estimate' in only(withFlows(own))).toBe(false)
  })

  it('is refused past the most a household may carry, as before', () => {
    let p = defaultProfile({ year: 2026 })
    for (let i = 0; i < MAX_FLOWS + 3; i++) p = addFlow(p, flow({ label: `n${i}` }))
    expect(p.household.flows).toHaveLength(MAX_FLOWS)
  })
})

describe('typing another amount makes the figure the person\'s own', () => {
  it('the estimate goes, and the key with it — not a key holding undefined', () => {
    const p = updateFlow(withFlows(flow()), 0, (f) => ({ ...f, amount: 2500 }))
    expect(only(p).amount).toBe(2500)
    expect('estimate' in only(p)).toBe(false)
    expect(JSON.parse(JSON.stringify(p)).household.flows[0]).not.toHaveProperty('estimate')
  })

  it('typing the SAME amount changes nothing: it is still the estimate', () => {
    const p = withFlows(flow())
    expect(only(updateFlow(p, 0, (f) => ({ ...f, amount: 1667 }))).estimate).toBe('upkeep')
  })

  it('the name, the years, the kind and the owner may change and the amount they rest on has not moved: still an estimate', () => {
    let p = withFlows(flow())
    p = updateFlow(p, 0, (f) => ({ ...f, label: 'Ma maison' }))
    p = updateFlow(p, 0, (f) => ({ ...f, fromYear: 2030, toYear: 2060 }))
    expect(only(p)).toMatchObject({ label: 'Ma maison', fromYear: 2030, toYear: 2060, estimate: 'upkeep' })
  })

  it('an event that was already the person\'s own stays theirs', () => {
    const { estimate: _estimate, ...own } = flow()
    expect('estimate' in only(updateFlow(withFlows(own), 0, (f) => ({ ...f, amount: 9 })))).toBe(false)
  })

  it('an index that is not an event changes nothing: the same profile back', () => {
    const p = withFlows(flow())
    expect(updateFlow(p, 5, (f) => ({ ...f, amount: 1 }))).toBe(p)
    expect(updateFlow(p, -1, (f) => ({ ...f, amount: 1 }))).toBe(p)
  })
})

describe('« Confirmer ce montant »', () => {
  it('keeps the figure exactly and drops only the estimate', () => {
    const before = withFlows(flow())
    const after = confirmFlow(before, 0)
    expect(only(after)).toEqual({ label: 'Entretien', kind: 'expense', amount: 1667, fromYear: 2026, toYear: 2080, owner: 'self', taxable: false })
    expect('estimate' in only(after)).toBe(false)
  })

  it('touches only the event it is asked about', () => {
    const p = confirmFlow(withFlows(flow({ label: 'a' }), flow({ label: 'b', estimate: 'vehicle' })), 1)
    expect(p.household.flows!.map((f) => f.estimate)).toEqual(['upkeep', undefined])
  })

  it('an event that is already the person\'s own: the same profile back (nothing to write)', () => {
    const { estimate: _estimate, ...own } = flow()
    const p = withFlows(own)
    expect(confirmFlow(p, 0)).toBe(p)
    expect(confirmFlow(p, 3)).toBe(p)
  })
})

describe('what is saved', () => {
  it('an estimate and a confirmed event both pass the validator, and the estimate survives the round trip', () => {
    let p = withFlows(flow({ label: 'a' }), flow({ label: 'b', estimate: 'vehicle' }))
    p = confirmFlow(p, 1)
    const result = validateProfile(JSON.parse(JSON.stringify(p)))
    expect(result.ok, JSON.stringify(result.ok ? '' : result.problems)).toBe(true)
    if (result.ok) expect((result.profile.household.flows ?? []).map((f) => f.estimate)).toEqual(['upkeep', undefined])
  })

  it('removing an event takes its estimate with it', () => {
    expect(removeFlow(withFlows(flow()), 0).household.flows).toEqual([])
  })

  it('an estimate that is not a short string is refused', () => {
    const p = JSON.parse(JSON.stringify(withFlows(flow())))
    for (const bad of [42, true, 'x'.repeat(31)]) {
      p.household.flows[0].estimate = bad
      expect(validateProfile(p).ok, String(bad)).toBe(false)
    }
  })
})

describe('« Garder » a care period twice', () => {
  it('keeps ONE care expense under its label: the second replaces the first, never a twin that counts the care twice', () => {
    const care = (amount: number): Flow => ({ label: 'Soins de longue durée', kind: 'expense', amount, fromYear: 2060, toYear: 2069, owner: 'self', taxable: false })
    const once = keepFlowByLabel(defaultProfile({ year: 2026 }), care(30_000))
    const twice = keepFlowByLabel(once, care(36_000))
    expect(twice.household.flows).toHaveLength(1)
    expect(twice.household.flows![0].amount).toBe(36_000)
    // another expense of another label is its own
    expect(keepFlowByLabel(twice, { ...care(5_000), label: 'Toit' }).household.flows).toHaveLength(2)
  })
})

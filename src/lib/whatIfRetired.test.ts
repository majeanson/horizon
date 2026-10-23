import { describe, expect, it } from 'vitest'
import { EXAMPLES, EXAMPLE_IDS, type ExampleId } from '../engine/golden/examples.ts'
import { exampleProfile } from './example.ts'
import { planFacts, whatIfFacts, type PlanFacts, type RetireeLeverFact, type WhatIfFacts } from './planFacts.ts'
import { whatIfCards } from './whatIfCopy.ts'

// A HOUSEHOLD THAT HAS ALREADY STOPPED WORKING asks different things from one that has not: not « when can we stop? » (there is no age left to move) but « does the money last, until
// when, how much can we spend, and what helps? ». Its cards read the plan as it stands. These hold that, on the retired examples for real and on made-up facts for the branches they never reach.

const LANGS = ['fr', 'en'] as const
const nowOf = (id: ExampleId) => EXAMPLES[id].assumptions.today

describe('the cards of the retired examples', { timeout: 300_000 }, () => {
  const RETIRED = ['retired', 'melter', 'couple62'] as const
  const cache = new Map<ExampleId, { f: PlanFacts; w: WhatIfFacts }>()
  const factsOf = (id: ExampleId) => {
    let x = cache.get(id)
    if (!x) cache.set(id, (x = { f: planFacts(exampleProfile(id), nowOf(id)), w: whatIfFacts(exampleProfile(id), nowOf(id)) }))
    return x
  }
  const cards = (id: ExampleId, lang: 'fr' | 'en') => whatIfCards(lang, factsOf(id).f, factsOf(id).w, EXAMPLES[id].household.persons[0].name)

  it('only the households that have all stopped working have retiree facts', () => {
    for (const id of EXAMPLE_IDS) expect(factsOf(id).f.retiree !== null, id).toBe(factsOf(id).f.everyoneRetired)
    expect(RETIRED.every((id) => factsOf(id).f.everyoneRetired)).toBe(true)
  })

  it('lead with how much can be spent, then the crash; the rest are the changes that help', () => {
    for (const id of RETIRED)
      for (const lang of LANGS) {
        const out = cards(id, lang)
        expect(out[0].id, `${id} ${lang}`).toBe('spendMax')
        expect(out[1].id, `${id} ${lang}`).toBe('crash')
        expect(out.length, `${id} ${lang}`).toBeGreaterThanOrEqual(4)
        for (const c of out) expect(c.text + c.title, `${id} ${lang} ${c.id}`).not.toMatch(/[{}]/)
      }
  })

  it('never talk about an earliest age to a household that has already stopped (there is none left to move)', () => {
    for (const id of RETIRED)
      for (const c of cards(id, 'fr').concat(cards(id, 'en'))) expect(c.title + ' ' + c.text, `${id} ${c.id}`).not.toMatch(/âge le plus tôt|earliest age/i)
  })

  it('a plan that holds: spending less says what is left; a plan that runs short: it says whether the money then lasts', () => {
    const lever = (id: ExampleId, which: string, lang: 'fr' | 'en') => cards(id, lang).find((c) => c.id === which)!.text
    expect(lever('retired', 'spend10', 'fr')).toContain('il reste')
    expect(lever('retired', 'spend10', 'fr')).toContain('de plus')
    expect(lever('retired', 'spend10', 'en')).toContain('more is left')
    expect(lever('couple62', 'spend10', 'fr')).toContain('dure alors jusqu’à la fin du plan')
    expect(lever('couple62', 'spend10', 'en')).toContain('then lasts to the end of the plan')
  })

  it('starting the pensions later can make the shortfall come SOONER, and the card says so', () => {
    expect(cards('couple62', 'fr').find((c) => c.id === 'pensions70')!.text).toMatch(/plus tôt : dès \d{4} au lieu de 2032/)
    expect(cards('couple62', 'en').find((c) => c.id === 'pensions70')!.text).toMatch(/sooner: from \d{4} instead of 2032/)
  })

  it('the spending card says how much room there is, or how much would have to go', () => {
    expect(cards('retired', 'fr')[0].text).toContain('de plus que les')
    expect(cards('couple62', 'fr')[0].text).toContain('de moins que les')
    expect(cards('couple62', 'en')[0].text).toContain('less than the')
  })

  it('the changes come best first, as the engine ranked them', () => {
    for (const id of RETIRED) {
      const ids = cards(id, 'fr').map((c) => c.id).filter((x) => x !== 'spendMax' && x !== 'crash' && x !== 'death')
      expect(ids, id).toEqual(factsOf(id).f.retiree!.levers.map((l) => l.id))
    }
  })
})

describe('the retiree branches no example reaches, on made-up facts', () => {
  const lever = (over: Partial<RetireeLeverFact> & Pick<RetireeLeverFact, 'id'>): RetireeLeverFact => ({ lasts: true, firstShortfallYear: null, nestEnd: 200_000, endGain: 50_000, ...over })
  const facts = (holds: boolean, levers: RetireeLeverFact[], over: Partial<PlanFacts> = {}): PlanFacts => ({
    kind: 'now', earliest: 70, everyoneRetired: true, ownPlanHolds: holds, firstShortfallYear: holds ? null : 2040, nestEnd: holds ? 150_000 : 0, comfort: undefined,
    levers: [], retiree: { maxSpend: 50_000, asked: 45_000, levers }, ...over,
  })
  const wi = (crash: Partial<WhatIfFacts['crash']> = {}): WhatIfFacts => ({ crash: { earliest: null, base: null, ownPlanHolds: true, firstShortfallYear: null, nestEnd: 120_000, ...crash }, death: null })
  const text = (lang: 'fr' | 'en', f: PlanFacts, w: WhatIfFacts, id: string) => whatIfCards(lang, f, w, 'A').find((c) => c.id === id)!.text

  it('a plan that holds: more left, less left, nothing changes, or the change would break it', () => {
    expect(text('fr', facts(true, [lever({ id: 'spend10', endGain: 30_000 })]), wi(), 'spend10')).toContain('il reste')
    expect(text('fr', facts(true, [lever({ id: 'spend10', endGain: -20_000 })]), wi(), 'spend10')).toContain('de moins')
    expect(text('en', facts(true, [lever({ id: 'spend10', endGain: 0 })]), wi(), 'spend10')).toBe('This changes nothing in the plan: the money lasts to the end.')
    expect(text('fr', facts(true, [lever({ id: 'pensions70', lasts: false, firstShortfallYear: 2045 })]), wi(), 'pensions70')).toContain('manquerait dès 2045')
  })

  it('a plan that runs short: fixed, later, the same year, or sooner', () => {
    const short = (l: Partial<RetireeLeverFact>) => text('en', facts(false, [lever({ id: 'income', ...l })]), wi(), 'income')
    expect(short({ lasts: true })).toContain('then lasts to the end')
    expect(short({ lasts: false, firstShortfallYear: 2044 })).toBe('The money runs short later: from 2044 instead of 2040.')
    expect(short({ lasts: false, firstShortfallYear: 2040 })).toBe('The money still runs short from 2040.')
    expect(short({ lasts: false, firstShortfallYear: 2037 })).toContain('sooner: from 2037 instead of 2040')
  })

  it('the spending card when not even nothing lasts', () => {
    const f = facts(false, [])
    f.retiree!.maxSpend = null
    expect(text('fr', f, wi(), 'spendMax')).toContain('Même sans rien dépenser')
  })

  it('the crash, read on the plan: it still holds, it would break, or it was already short', () => {
    expect(text('fr', facts(true, []), wi({ ownPlanHolds: true, nestEnd: 90_000 }), 'crash')).toContain('l’argent dure jusqu’à la fin du plan')
    expect(text('en', facts(true, []), wi({ ownPlanHolds: false, firstShortfallYear: 2048 }), 'crash')).toBe('After a market fall early in retirement, the money would run short from 2048.')
    expect(text('en', facts(false, []), wi({ ownPlanHolds: false, firstShortfallYear: 2036 }), 'crash')).toBe('The money was already running short from 2040; after a market fall, it would run short from 2036.')
  })
})

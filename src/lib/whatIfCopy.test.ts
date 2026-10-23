import { describe, expect, it } from 'vitest'
import { EXAMPLES, EXAMPLE_IDS, type ExampleId } from '../engine/golden/examples.ts'
import { exampleProfile } from './example.ts'
import { planFacts, whatIfFacts, type PlanFacts, type WhatIfFacts } from './planFacts.ts'
import { tokensIn, type TokenName } from './storyTokens.ts'
import { WHATIF_WORDS, whatIfCards, type WhatIfId } from './whatIfCopy.ts'

// THE « AND IF…? » CARDS: generic texts, so what they may say is checked on any household — the fourteen examples for real, and made-up facts for the branches no example reaches.

const LANGS = ['fr', 'en'] as const
const ORDER: WhatIfId[] = ['crash', 'death', 'spend10', 'pensions70']
const ALLOWED: readonly TokenName[] = ['age', 'base', 'year', 'baseYear', 'who', 'nestEnd', 'nestEndBase', 'gain', 'yearsWord', 'maxSpend', 'asked', 'margin', 'cut']
const nowOf = (id: ExampleId) => EXAMPLES[id].assumptions.today
const flatten = (prefix: string, o: unknown): { key: string; text: string }[] => (typeof o === 'string' ? [{ key: prefix, text: o }] : Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => flatten(prefix ? `${prefix}.${k}` : k, v)))
const flat = (lang: 'fr' | 'en') => flatten('', WHATIF_WORDS[lang])

const baseFacts: PlanFacts = { kind: 'at', earliest: 60, everyoneRetired: false, ownPlanHolds: true, firstShortfallYear: null, nestEnd: 400_000, comfort: 80_000, levers: [], retiree: null }
const baseWhatIf: WhatIfFacts = { crash: { earliest: 62, base: 60, ownPlanHolds: true, firstShortfallYear: null, nestEnd: 100_000 }, death: null }

describe('the templates', () => {
  it('hold no figure of their own (a digit is a number the engine did not give), and the two languages have the same keys and the same tokens', () => {
    const fr = flat('fr')
    const en = flat('en')
    expect(fr.map((x) => x.key)).toEqual(en.map((x) => x.key))
    fr.forEach((s, i) => {
      expect(s.text, s.key).not.toMatch(/\d/)
      expect(en[i].text, s.key).not.toMatch(/\d/)
      expect(tokensIn(s.text).sort(), s.key).toEqual(tokensIn(en[i].text).sort())
      for (const t of tokensIn(s.text)) expect(ALLOWED, `${s.key} uses {${t}}`).toContain(t)
    })
  })
})

describe('the money basis', () => {
  it('every template that states an amount says it is in today\'s dollars (a figure in some other year\'s dollars is the mistake the facts pack exists to prevent)', () => {
    for (const lang of LANGS) {
      const said = lang === 'fr' ? /aujourd’hui/ : /today’s/
      for (const s of flat(lang)) {
        const money = tokensIn(s.text).some((t) => ['nestEnd', 'nestEndBase', 'gain', 'maxSpend', 'asked', 'margin', 'cut'].includes(t))
        if (money) expect(s.text, `${lang} ${s.key} states an amount without its dollars`).toMatch(said)
      }
    }
  })
})

describe('the cards of the fourteen examples', { timeout: 300_000 }, () => {
  const cache = new Map<ExampleId, { f: PlanFacts; w: WhatIfFacts }>()
  const factsOf = (id: ExampleId) => {
    let x = cache.get(id)
    if (!x) cache.set(id, (x = { f: planFacts(exampleProfile(id), nowOf(id)), w: whatIfFacts(exampleProfile(id), nowOf(id)) }))
    return x
  }
  const cards = (id: ExampleId, lang: 'fr' | 'en') => whatIfCards(lang, factsOf(id).f, factsOf(id).w, EXAMPLES[id].household.persons[0].name)

  it('render in both languages with no token left, in a fixed order, each with a title and a text', () => {
    for (const id of EXAMPLE_IDS)
      for (const lang of LANGS) {
        const out = cards(id, lang)
        expect(out.length, `${id} ${lang}`).toBeGreaterThanOrEqual(2)
        // a household still working has a fixed order; a retiree's changes come best first as the engine ranked them (whatIfRetired.test.ts holds that)
        if (!factsOf(id).f.retiree) {
          const order = out.map((c) => ORDER.indexOf(c.id))
          expect(order, `${id} ${lang}`).toEqual([...order].sort((a, b) => a - b))
        }
        for (const c of out) {
          expect(c.title.trim(), `${id} ${lang} ${c.id}`).not.toBe('')
          expect(c.text + c.title, `${id} ${lang} ${c.id}`).not.toMatch(/[{}]/)
        }
      }
  })

  it('a death card only for a couple; a lever card only where the lever applies', () => {
    for (const id of EXAMPLE_IDS) {
      const ids = cards(id, 'fr').map((c) => c.id)
      expect(ids.includes('death'), `${id}`).toBe(EXAMPLES[id].household.persons.length === 2)
      const f = factsOf(id).f
      expect(ids.includes('pensions70'), `${id}`).toBe((f.retiree ? f.retiree.levers : f.levers).some((l) => l.id === 'pensions70'))
    }
  })

  it('the engine picks the variant: more left after a death for the rich couple, less for the golden one, a plan already short stays short', () => {
    const death = (id: ExampleId, lang: 'fr' | 'en') => cards(id, lang).find((c) => c.id === 'death')!.text
    expect(death('rich', 'fr')).toContain('dépense moins')
    expect(death('rich', 'en')).toContain('spends less')
    expect(death('golden', 'fr')).toContain('ne remplace pas')
    expect(death('golden', 'en')).toContain('does not replace')
    expect(death('couple62', 'fr')).toContain('manquait déjà')
    expect(death('couple62', 'en')).toContain('already short')
  })

  it('the crash card states the two ages the engine found, and how many years apart', () => {
    const t = cards('golden', 'fr').find((c) => c.id === 'crash')!.text
    expect(t).toContain('de 60 à 61 ans')
    expect(t).toContain('1 an de plus')
    expect(cards('golden', 'en').find((c) => c.id === 'crash')!.text).toContain('from 60 to 61')
  })

  it('no example ever finds a lever that leaves LESS money at the end (if one does, the « less » wording is read by a person before it ships)', () => {
    for (const id of EXAMPLE_IDS) for (const l of factsOf(id).f.levers) if (l.id === 'spend10' || l.id === 'pensions70') expect(l.endGain ?? 0, `${id} ${l.id}`).toBeGreaterThanOrEqual(0)
  })
})

describe('the branches no example reaches, on made-up facts', () => {
  const lever = (id: 'spend10' | 'pensions70', yearsGained: number | null, endGain: number | null) => ({ ...baseFacts, levers: [{ id, yearsGained, endGain }] })

  it('no crash card when no age works as things stand; a crash that ends every answer says so', () => {
    expect(whatIfCards('fr', baseFacts, { ...baseWhatIf, crash: { ...baseWhatIf.crash, base: null, earliest: null } }, 'A').map((c) => c.id)).not.toContain('crash')
    const none = whatIfCards('fr', baseFacts, { ...baseWhatIf, crash: { earliest: null, base: 60, ownPlanHolds: false, firstShortfallYear: 2040, nestEnd: 0 } }, 'A').find((c) => c.id === 'crash')!
    expect(none.text).toContain('aucun âge ne fonctionne plus')
    expect(none.text).toContain('manquerait')
  })

  it('a crash that changes nothing says the age stays', () => {
    const same = whatIfCards('en', baseFacts, { ...baseWhatIf, crash: { earliest: 60, base: 60, ownPlanHolds: true, firstShortfallYear: null, nestEnd: 50_000 } }, 'A').find((c) => c.id === 'crash')!
    expect(same.text).toContain('stays at 60')
  })

  it('a lever with no comparison (no age on either side) is not shown', () => {
    expect(whatIfCards('fr', lever('spend10', null, 10_000), baseWhatIf, 'A').map((c) => c.id)).not.toContain('spend10')
    expect(whatIfCards('fr', lever('spend10', 2, null), baseWhatIf, 'A').map((c) => c.id)).not.toContain('spend10')
  })

  it('a lever that moves the answer later, and one that leaves less, say so; one that adds nothing says nothing about money', () => {
    const later = whatIfCards('fr', lever('pensions70', -2, -30_000), baseWhatIf, 'A').find((c) => c.id === 'pensions70')!.text
    expect(later).toContain('2 ans plus tard')
    expect(later).toContain('de moins')
    const sameNoGain = whatIfCards('en', lever('spend10', 0, 0), baseWhatIf, 'A').find((c) => c.id === 'spend10')!.text
    expect(sameNoGain).toBe('The earliest age that works does not change.')
  })

  it('one year is « 1 an » / « 1 year », several are plural', () => {
    expect(whatIfCards('fr', lever('spend10', 1, 5_000), baseWhatIf, 'A').find((c) => c.id === 'spend10')!.text).toContain('1 an plus tôt')
    expect(whatIfCards('en', lever('spend10', 3, 5_000), baseWhatIf, 'A').find((c) => c.id === 'spend10')!.text).toContain('3 years sooner')
  })
})

import { describe, expect, it } from 'vitest'
import { EXAMPLES, EXAMPLE_IDS, type ExampleId } from '../engine/golden/examples.ts'
import { COMFORT, EXAMPLE_STORY, deriveFeatures, renderStory, type StoryText } from './exampleStory.ts'
import { exampleProfile } from './example.ts'
import { planFacts, type PlanFacts } from './planFacts.ts'
import { tokensIn, type TokenName } from './storyTokens.ts'

// THE STORIES OF THE EXAMPLE HOUSEHOLDS HOLD NO FIGURE OF THEIR OWN. They hold templates; what they may say about a figure is checked here, and what they say about the
// household is checked against its data. A story the engine has moved away from fails here in a way that names the example, instead of reading wrongly on the page.

const LANGS = ['fr', 'en'] as const
const ALLOWED_TOKENS: readonly TokenName[] = ['age', 'year', 'nestEnd', 'comfort']
const nowOf = (id: ExampleId) => EXAMPLES[id].assumptions.today
const sentencesOf = (t: StoryText): { where: string; text: string }[] => [
  ...Object.entries(t.answer).map(([k, text]) => ({ where: `answer.${k}`, text: text as string })),
  ...Object.entries(t.plan).map(([k, text]) => ({ where: `plan.${k}`, text: text as string })),
  { where: 'distinct', text: t.distinct },
]

describe('every example has a story in both languages', () => {
  it('and only the fourteen', () => {
    expect(Object.keys(EXAMPLE_STORY).sort()).toEqual([...EXAMPLE_IDS].sort())
  })

  it('no template types a figure: a digit in a sentence is a number the engine did not give', () => {
    for (const id of EXAMPLE_IDS)
      for (const lang of LANGS)
        for (const { where, text } of sentencesOf(EXAMPLE_STORY[id][lang])) expect(text, `${id} ${lang} ${where}`).not.toMatch(/\d/)
    for (const lang of LANGS) expect(COMFORT[lang]).not.toMatch(/\d/)
  })

  it('the detector catches a typed figure and lets a token through (canary)', () => {
    const digit = /\d/
    expect(digit.test('ils ont 85 000 $ de revenu')).toBe(true)
    expect(digit.test('dès {age} ans, {nestEnd}')).toBe(false)
  })

  it('every token is one the facts give, and the two languages say the same things (same tokens, sentence by sentence)', () => {
    for (const id of EXAMPLE_IDS) {
      const fr = sentencesOf(EXAMPLE_STORY[id].fr)
      const en = sentencesOf(EXAMPLE_STORY[id].en)
      expect(fr.map((s) => s.where), `${id}: the languages have different sentences`).toEqual(en.map((s) => s.where))
      fr.forEach((s, i) => {
        const a = tokensIn(s.text).sort()
        const b = tokensIn(en[i].text).sort()
        expect(a, `${id} ${s.where}`).toEqual(b)
        for (const t of a) expect(ALLOWED_TOKENS, `${id} ${s.where} uses {${t}}`).toContain(t)
      })
    }
  })

  it('a sentence about a plan that runs short says WHEN, and one about a plan that holds says what is left', () => {
    for (const id of EXAMPLE_IDS)
      for (const lang of LANGS) {
        const { plan } = EXAMPLE_STORY[id][lang]
        if (plan.short) expect(tokensIn(plan.short), `${id} ${lang} short`).toContain('year')
        if (plan.holds) {
          expect(tokensIn(plan.holds), `${id} ${lang} holds`).toContain('nestEnd')
          expect(tokensIn(plan.holds), `${id} ${lang} holds`).not.toContain('year')
        }
      }
  })

  it('the answer sentence of an « at » headline states the age; one of « now » may not claim a future age', () => {
    for (const id of EXAMPLE_IDS)
      for (const lang of LANGS) {
        const { answer } = EXAMPLE_STORY[id][lang]
        if (answer.at) expect(tokensIn(answer.at), `${id} ${lang}`).toContain('age')
      }
  })

  it('each story names the people it is about, in the answer sentence', () => {
    for (const id of EXAMPLE_IDS)
      for (const lang of LANGS) {
        const { answer } = EXAMPLE_STORY[id][lang]
        const text = Object.values(answer).join(' ')
        for (const p of EXAMPLES[id].household.persons) expect(text, `${id} ${lang}`).toContain(p.name)
      }
  })

  it('the features a story declares are exactly what the household is (its data decides, not the prose)', () => {
    const wrong = EXAMPLE_IDS.flatMap((id) => {
      const declared = [...EXAMPLE_STORY[id].features].sort()
      const actual = deriveFeatures(exampleProfile(id).household, nowOf(id)).sort()
      return JSON.stringify(declared) === JSON.stringify(actual) ? [] : [`${id}: declares ${declared.join(',')} but is ${actual.join(',')} — the example changed, re-read its story`]
    })
    expect(wrong).toEqual([])
  })
})

describe('what is shown for each example', { timeout: 300_000 }, () => {
  const facts = new Map<ExampleId, PlanFacts>()
  const factsOf = (id: ExampleId) => {
    let f = facts.get(id)
    if (!f) facts.set(id, (f = planFacts(exampleProfile(id), nowOf(id))))
    return f
  }

  it('the sentence the engine calls for exists in both languages, and renders with no token left', () => {
    for (const id of EXAMPLE_IDS)
      for (const lang of LANGS) {
        const out = renderStory(id, lang, factsOf(id))
        expect(out.length, `${id} ${lang}`).toBeGreaterThanOrEqual(3)
        for (const s of out) {
          expect(s, `${id} ${lang}`).not.toMatch(/[{}]/)
          expect(s.length, `${id} ${lang}: a sentence of this length is a paragraph`).toBeLessThanOrEqual(260)
        }
      }
  })

  it('the figures in the text are the engine\'s: the age, the money left, the first short year', () => {
    for (const id of EXAMPLE_IDS) {
      const f = factsOf(id)
      for (const lang of LANGS) {
        const text = renderStory(id, lang, f).join(' ')
        if (f.kind === 'at') expect(text, `${id} ${lang} age`).toContain(String(f.earliest))
        if (f.ownPlanHolds) expect(text, `${id} ${lang} nest`).toMatch(/\d/)
        else expect(text, `${id} ${lang} year`).toContain(String(f.firstShortfallYear))
      }
    }
  })

  it('a household whose plan runs short is never told it holds, and the other way round', () => {
    for (const id of EXAMPLE_IDS) {
      const f = factsOf(id)
      const { plan } = EXAMPLE_STORY[id].fr
      expect(f.ownPlanHolds ? plan.holds : plan.short, `${id}: the text for the engine's verdict is missing`).toBeDefined()
    }
  })

  it('both languages tell the same story in the figures too (same digits, in the same order)', () => {
    for (const id of EXAMPLE_IDS) {
      const digits = (lang: 'fr' | 'en') => renderStory(id, lang, factsOf(id)).join(' ').replace(/[^\d ]/g, '').replace(/\s+/g, ' ').split(' ').filter(Boolean).join('').replace(/\D/g, '')
      expect(digits('fr'), id).toBe(digits('en'))
    }
  })
})

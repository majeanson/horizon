import { describe, expect, it } from 'vitest'
import { OWN_STORY, renderOwnStory } from './ownStory.ts'
import type { PlanFacts } from './planFacts.ts'
import { tokensIn } from './storyTokens.ts'

// THE ONE SENTENCE ABOUT THE HOUSEHOLD ON THIS DEVICE: a template picked by the facts, never a figure of its own.

const facts = (over: Partial<PlanFacts>): PlanFacts => ({ kind: 'at', earliest: 60, everyoneRetired: false, ownPlanHolds: true, firstShortfallYear: null, nestEnd: 300_000, comfort: 70_000, levers: [], retiree: null, ...over })
const retiree = { maxSpend: 50_000, asked: 45_000, levers: [] }
// the French money format puts a non-breaking space between the thousands and before the sign
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ')
const flat = (lang: 'fr' | 'en') => Object.entries(OWN_STORY[lang]).flatMap(([who, v]) => Object.entries(v).map(([k, text]) => ({ key: `${who}.${k}`, text: text as string })))

describe('the sentence about the household on this device', () => {
  it('types no figure, uses only tokens it can fill, and says the same in both languages', () => {
    const fr = flat('fr')
    const en = flat('en')
    expect(fr.map((s) => s.key)).toEqual(en.map((s) => s.key))
    fr.forEach((s, i) => {
      expect(s.text, s.key).not.toMatch(/\d/)
      expect(tokensIn(s.text).sort(), s.key).toEqual(tokensIn(en[i].text).sort())
      for (const t of tokensIn(s.text)) expect(['nestEnd', 'year'], `${s.key} {${t}}`).toContain(t)
      if (tokensIn(s.text).includes('nestEnd')) expect(s.text, s.key).toMatch(/aujourd’hui|today’s/)
    })
  })

  it('a plan that runs short says WHEN; one that holds says what is left', () => {
    for (const lang of ['fr', 'en'] as const) for (const who of ['retired', 'working'] as const) {
      expect(tokensIn(OWN_STORY[lang][who].short), `${lang} ${who} short`).toContain('year')
      expect(tokensIn(OWN_STORY[lang][who].holds), `${lang} ${who} holds`).toContain('nestEnd')
    }
  })

  it('is told to someone who has stopped, or not, by the facts, and in the plan\'s own money', () => {
    expect(plain(renderOwnStory('fr', facts({ retiree, nestEnd: 275_000 })))).toBe('Vous avez déjà arrêté de travailler : l’argent dure jusqu’à la fin du plan, avec environ 275 000 $ à la fin, en dollars d’aujourd’hui.')
    expect(renderOwnStory('en', facts({ retiree, ownPlanHolds: false, firstShortfallYear: 2031, nestEnd: 0 }))).toBe('You have already stopped working, but the money runs short from 2031, and nothing is left at the end.')
    expect(renderOwnStory('fr', facts({ ownPlanHolds: false, firstShortfallYear: 2038, nestEnd: 0 }))).toContain('manque dès 2038')
    expect(renderOwnStory('en', facts({}))).toContain('Leaving at the ages you planned')
  })
})

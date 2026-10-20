import { describe, expect, it } from 'vitest'
import { WELCOME_COPY } from './welcomeCopy.ts'

// THE FRONT DOOR'S WORDS: the guide to the whole app says the same places in both languages, every place that is a page leads to a real route of the app, and every line says something.

const ROUTES = new Set(['/profil', '/hypotheses', '/resultats', '/decider', '/fiche'])
const VIEWS = new Set(['decide', 'proof'])

describe('the home page guide', () => {
  const { fr, en } = WELCOME_COPY
  it('has the same places, in the same order, in both languages', () => {
    expect(fr.guide.length).toBe(en.guide.length)
    expect(fr.guide.map((g) => g.to)).toEqual(en.guide.map((g) => g.to))
    expect(fr.guide.length).toBeGreaterThanOrEqual(6)
  })

  it('says something in each line, and never the same words in French and in English', () => {
    for (const [i, g] of fr.guide.entries()) {
      expect(g.name.length, `${i} name`).toBeGreaterThan(2)
      expect(g.text.length, `${i} text`).toBeGreaterThan(30)
      expect(en.guide[i].text, `${i} translated`).not.toBe(g.text)
    }
    expect(fr.guideTitle).not.toBe(en.guideTitle)
  })

  it('leads each page to a route the app has, and each Résultats view to a view it has', () => {
    for (const g of [...fr.guide, ...en.guide]) {
      if (g.to === null) continue
      const url = new URL(g.to, 'https://horizon.test')
      expect(ROUTES.has(url.pathname), g.to).toBe(true)
      const v = url.searchParams.get('v')
      if (v !== null) expect(VIEWS.has(v), g.to).toBe(true)
    }
  })
})

// THE HERO, its dialog and the demo card. The hero says what Horizon does and keeps its two promises in view — that nothing leaves the device and that
// every government figure is cited — in both languages, each line said in a single sentence.
describe('the front door hero, dialog and demo card', () => {
  const { fr, en } = WELCOME_COPY
  it('says three things in the hero, the same three in both languages, one sentence each', () => {
    expect(fr.promises.length).toBe(3)
    expect(en.promises.length).toBe(fr.promises.length)
    for (const [i, p] of fr.promises.entries()) {
      expect(p.length, `${i}`).toBeGreaterThan(20)
      expect(p.length, `${i} fits a line or two`).toBeLessThanOrEqual(110)
      expect(p.match(/[.!?]/g) ?? [], `${i} one sentence`).toHaveLength(1)
      expect(en.promises[i], `${i} translated`).not.toBe(p)
    }
  })
  it('keeps both promises in view: nothing leaves the device, and the figures are cited', () => {
    expect(fr.promises.join(' ')).toMatch(/appareil/)
    expect(fr.promises.join(' ')).toMatch(/officielle/)
    expect(en.promises.join(' ')).toMatch(/device/)
    expect(en.promises.join(' ')).toMatch(/official/)
  })
  it('translates the two buttons and the dialog', () => {
    for (const k of ['begin', 'example'] as const) expect(en[k], k).not.toBe(fr[k])
    for (const k of ['title', 'lead'] as const) {
      expect(fr.dialog[k].length, k).toBeGreaterThan(8)
      expect(en.dialog[k], k).not.toBe(fr.dialog[k])
    }
  })
  it('translates the demo card, line by line', () => {
    for (const key of ['title', 'pick', 'frame', 'try'] as const) {
      expect(fr.demo[key].length, key).toBeGreaterThan(8)
      expect(en.demo[key], key).not.toBe(fr.demo[key])
    }
  })
})

// THE DRIP QUESTION: the card on the front door speaks both languages, counts in the right plural, and its two links are routes the Profil page answers
// (the figure's own link is built from a fact id in the component; the second one is the figure guide's anchor).
describe('the front door drip question', () => {
  const { fr, en } = WELCOME_COPY
  it('is translated, line by line', () => {
    for (const key of ['title', 'go', 'all', 'later'] as const) {
      expect(fr.drip[key].length, key).toBeGreaterThan(3)
      expect(en.drip[key], key).not.toBe(fr.drip[key])
    }
  })
  it('says the gain in years with the right plural, in both languages', () => {
    expect(fr.drip.swing(1)).toContain('1 an.')
    expect(fr.drip.swing(3)).toContain('3 ans.')
    expect(en.drip.swing(1)).toContain('1 year.')
    expect(en.drip.swing(3)).toContain('3 years.')
  })
})

import { describe, expect, it } from 'vitest'
import { WELCOME_COPY } from './welcomeCopy.ts'

// THE FRONT DOOR'S WORDS: the guide to the whole app says the same places in both languages, every place that is a page leads to a real route of the app, and every line says something.

const ROUTES = new Set(['/profil', '/hypotheses', '/resultats', '/fiche'])
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

// THE THREE DOORS and the demo card: each door is translated, says something, and leads to a route the app has; the quick door carries the address key Profil reads.
describe('the front door doors and demo card', () => {
  const { fr, en } = WELCOME_COPY
  it('has three doors, in the same order, to the same places, in both languages', () => {
    expect(fr.doors.length).toBe(3)
    expect(en.doors.map((d) => d.to)).toEqual(fr.doors.map((d) => d.to))
    for (const [i, d] of fr.doors.entries()) {
      expect(d.label.length, `${i} label`).toBeGreaterThan(5)
      expect(d.hint.length, `${i} hint`).toBeGreaterThan(20)
      expect(en.doors[i].label, `${i} label translated`).not.toBe(d.label)
      expect(en.doors[i].hint, `${i} hint translated`).not.toBe(d.hint)
    }
    expect(fr.doorsTitle).not.toBe(en.doorsTitle)
  })
  it('leads each door to a route the app has, the quick one with its key and the document one to the checklist', () => {
    for (const d of [...fr.doors, ...en.doors]) expect(ROUTES.has(new URL(d.to, 'https://horizon.test').pathname), d.to).toBe(true)
    const [quick, full, docs] = fr.doors.map((d) => new URL(d.to, 'https://horizon.test'))
    expect(quick.searchParams.get('debut')).toBe('rapide')
    expect(full.search).toBe('')
    expect(docs.searchParams.get('par')).toBe('document')
    expect(docs.searchParams.get('etape')).toBe('gather')
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

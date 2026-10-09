import { describe, expect, it } from 'vitest'
import { DOC_IDS, docFigures, factsOf } from './facts.ts'
import { documentItems, documentsText } from './documentsList.ts'
import { DOCUMENTS_COPY } from './documentsCopy.ts'
import { exampleProfile } from './example.ts'
import { GUIDE_COPY } from './guideCopy.ts'

// THE LIST OF DOCUMENTS: built from the facts and the guide's own wording, so it names every document the profile is typed from — and none it is not.

const alone = [{ id: 'self' as const, name: 'Camille' }]
const couple = [...alone, { id: 'spouse' as const, name: 'Alex' }]
const urlOf = (doc: string) => (doc === 'rrq' ? 'https://example.test/releve' : null)

describe('documentItems', () => {
  it('one item per document for a household, one per person for a document each person has', () => {
    const one = documentItems(alone, GUIDE_COPY.fr, urlOf)
    expect(one).toHaveLength(7) // five documents each person has + the household's home and budget
    const two = documentItems(couple, GUIDE_COPY.fr, urlOf)
    expect(two).toHaveLength(12) // five × two people + two for the household
    expect(new Set(two.map((i) => i.id)).size).toBe(12)
    expect(two.filter((i) => i.owner === 'household').map((i) => i.doc).sort()).toEqual(['budget', 'home'])
    // the person's name only where it tells two apart
    expect(one.every((i) => i.who === null)).toBe(true)
    expect(two.filter((i) => i.owner !== 'household').every((i) => i.who === 'Camille' || i.who === 'Alex')).toBe(true)
  })

  it('every figure the profile can ask for is read off exactly one document, in the profile’s own words', () => {
    const kinds = DOC_IDS.flatMap((d) => docFigures(d).kinds)
    expect(new Set(kinds).size).toBe(kinds.length)
    expect([...kinds].sort()).toEqual(Object.keys(GUIDE_COPY.fr.kind).sort())
    // …and the facts of a real household all land in a document of the list
    const facts = factsOf(exampleProfile('golden'))
    expect(facts.length).toBeGreaterThan(10)
    for (const f of facts) expect(docFigures(f.doc).kinds, f.id).toContain(f.kind)
    for (const item of documentItems(couple, GUIDE_COPY.fr, urlOf)) {
      expect(item.figures.length, item.id).toBeGreaterThan(0)
      expect(item.what.length, item.id).toBeGreaterThan(10)
      expect(item.how.length, item.id).toBeGreaterThan(10)
    }
  })

  it('the list runs from the most important document to the least: the spending budget and the tax notice first, the situational ones last', () => {
    const items = documentItems(couple, GUIDE_COPY.fr, urlOf)
    expect(DOC_IDS).toEqual(['budget', 'tax', 'bank', 'rrq', 'home', 'employer', 'residence'])
    const rank = { high: 0, medium: 1, situational: 2 } as const
    // grouped like the inputs — the household's documents, then each person's — and within a group, most important first
    expect(items.map((i) => i.owner)).toEqual(['household', 'household', ...Array(5).fill('self'), ...Array(5).fill('spouse')])
    for (let i = 1; i < items.length; i++) if (items[i].owner === items[i - 1].owner) expect(rank[items[i].weight], items[i].id).toBeGreaterThanOrEqual(rank[items[i - 1].weight])
    expect(items[0].doc).toBe('budget')
    expect(items.filter((i) => i.owner === 'self').map((i) => i.doc)).toEqual(['tax', 'bank', 'rrq', 'employer', 'residence'])
    expect(items[items.length - 1].doc).toBe('residence')
  })

  it('says the same in both languages: as many items, in the same order, each named differently', () => {
    const fr = documentItems(couple, GUIDE_COPY.fr, urlOf)
    const en = documentItems(couple, GUIDE_COPY.en, urlOf)
    expect(en.map((i) => i.id)).toEqual(fr.map((i) => i.id))
    for (let i = 0; i < fr.length; i++) expect(en[i].name, fr[i].id).not.toBe(fr[i].name)
  })
})

describe('documentsText', () => {
  const head = (lang: 'fr' | 'en') => {
    const c = DOCUMENTS_COPY[lang]
    return { title: c.fileTitle, intro: c.fileIntro, readOff: c.readOff, where: c.where, official: c.official, importance: c.importance, weights: c.weights, household: c.household, you: c.you }
  }
  it('is a plain list to keep beside the documents: a box to tick, what it is for, where it is — and the official page only when there is one', () => {
    const items = documentItems(couple, GUIDE_COPY.fr, urlOf)
    const text = documentsText(items, new Set(['rrq:self']), head('fr'))
    expect(text.split('\n')[0]).toBe(DOCUMENTS_COPY.fr.fileTitle)
    expect(text).toContain('[x] ' + GUIDE_COPY.fr.docs.rrq.name + ' — Camille')
    expect(text).toContain('[ ] ' + GUIDE_COPY.fr.docs.rrq.name + ' — Alex')
    expect((text.match(/^\[[ x]\] /gm) ?? []).length).toBe(12)
    // a heading each time the owner changes: the household's, then each person's
    expect((text.match(/^== .+ ==$/gm) ?? [])).toEqual([`== ${DOCUMENTS_COPY.fr.household} ==`, '== Camille ==', '== Alex =='])
    expect((text.match(/https:\/\/example\.test\/releve/g) ?? []).length).toBe(2)
    expect(text).toContain(GUIDE_COPY.fr.docs.home.how)
  })
})

describe('the checklist keeps what matters to the household', () => {
  it('drops the documents a household said it has no use for, per person, and keeps everything by default', () => {
    const all = documentItems(couple, GUIDE_COPY.fr, urlOf)
    const some = documentItems(couple, GUIDE_COPY.fr, urlOf, (doc, owner) => !(doc === 'employer' && owner === couple[1].id) && doc !== 'home')
    expect(all.length - some.length).toBe(2) // the home, and the second person's employer statement
    expect(some.some((i) => i.doc === 'home')).toBe(false)
    expect(some.filter((i) => i.doc === 'employer').map((i) => i.owner)).toEqual([couple[0].id])
  })
})

import { describe, expect, it } from 'vitest'
import { EN } from '../i18n.en.ts'
import { FR } from '../i18n.ts'
import { GLOSSARY_COPY, type GlossaryTerm } from './glossaryCopy.ts'
import { GLOSS_SIGLES } from './glossIndex.ts'

// The glossary is the one place an abbreviation is spelled out, so it must (1) say the same thing in both languages,
// (2) never link anywhere but an official page, and (3) AGREE with the full names the pages already print — « Régime de
// rentes du Québec (RRQ) » in the profile must be the glossary's name, not a variant of it.

const { fr, en } = GLOSSARY_COPY
const all = (g: typeof fr): GlossaryTerm[] => g.groups.flatMap((x) => [...x.terms])

// Official hosts only (the same families fieldInfoCopy.test.ts accepts for the ⓘ notes), plus the two named reference bodies.
const OFFICIAL = /^https:\/\/(www\.(canada\.ca|retraitequebec\.gouv\.qc\.ca|banqueducanada\.ca|bankofcanada\.ca)|institutpf\.org)\//

describe('the glossary, in both languages', () => {
  it('has the same groups, in the same order, with the same number of terms, and no empty text', () => {
    expect(en.groups.map((g) => g.id)).toEqual(fr.groups.map((g) => g.id))
    en.groups.forEach((g, i) => expect(g.terms.length, g.id).toBe(fr.groups[i].terms.length))
    expect(all(fr).length).toBeGreaterThan(20) // a floor: an empty export cannot pass
    for (const t of [...all(fr), ...all(en)]) {
      for (const k of ['abbr', 'name', 'plain'] as const) expect(t[k].trim().length, `${t.abbr}.${k}`).toBeGreaterThan(0)
    }
  })

  it('is translated, not pasted: every sentence differs between the languages', () => {
    const frT = all(fr)
    all(en).forEach((t, i) => expect(t.plain, t.abbr).not.toBe(frT[i].plain))
  })

  it('links only to official pages, over https, each term with its host named, and a term lists an abbreviation once', () => {
    for (const g of [fr, en]) {
      const seen = new Set<string>()
      for (const t of all(g)) {
        expect(seen.has(t.abbr), `${t.abbr} is listed twice`).toBe(false)
        seen.add(t.abbr)
        if (t.url) {
          expect(t.url, t.abbr).toMatch(OFFICIAL)
          expect(t.host?.length ?? 0, `${t.abbr} links to a page but does not say whose`).toBeGreaterThan(0)
        } else {
          expect(t.host, `${t.abbr} names a host but has no page`).toBeUndefined()
        }
      }
    }
  })

  it('both editions of a term point at a different page than the French one', () => {
    const frT = all(fr)
    all(en).forEach((t, i) => {
      if (!frT[i].url) return expect(t.url, t.abbr).toBeUndefined()
      expect(t.url, `${t.abbr} has no English page`).toBeDefined()
      expect(t.url, `${t.abbr}: the English edition links the French page`).not.toBe(frT[i].url)
    })
  })

  it('agrees with the full names the pages already spell out', () => {
    // Wherever a dictionary writes « name (SIGLE) », the name is the glossary's — not a variant of it.
    const pairs = { fr: ['RRQ', 'PSV', 'SRG', 'PBR', 'MGA'], en: ['QPP', 'OAS', 'GIS', 'ACB'] } as const
    const dict = { fr: JSON.stringify(FR).toLowerCase(), en: JSON.stringify(EN).toLowerCase() }
    for (const lang of ['fr', 'en'] as const) {
      for (const abbr of pairs[lang]) {
        const t = all(GLOSSARY_COPY[lang]).find((x) => x.abbr === abbr)!
        expect(dict[lang], `${lang}: no dictionary string spells « ${t.name} (${abbr}) » out`).toContain(`${t.name.toLowerCase()} (${abbr.toLowerCase()})`)
      }
    }
  })

  it('gives each entry one id, the same in both languages, and the sigle index points at real entries', () => {
    const frT = all(fr)
    expect(all(en).map((t) => t.id)).toEqual(frT.map((t) => t.id))
    const ids = frT.map((t) => t.id)
    expect(new Set(ids).size, 'an id is used twice').toBe(ids.length)
    for (const id of ids) expect(id, 'ids are lowercase, dashed, ASCII').toMatch(/^[a-z]+(-[a-z]+)*$/)
    for (const lang of ['fr', 'en'] as const) {
      const byId = new Map(all(GLOSSARY_COPY[lang]).map((t) => [t.id, t]))
      for (const [sigle, id] of Object.entries(GLOSS_SIGLES[lang])) {
        expect(byId.get(id)?.abbr, `${lang}: ${sigle} links to « ${id} », which is not that sigle's entry`).toBe(sigle)
      }
      // The converse: every one-word capital sigle the glossary explains is linkable from the pages.
      for (const t of byId.values()) if (/^[A-Z]{3,6}$/.test(t.abbr)) expect(GLOSS_SIGLES[lang][t.abbr], `${lang}: ${t.abbr} is explained but never linked`).toBe(t.id)
    }
  })

  it('the documents checklist and the « go further » list: same items in both languages, official links, a publisher for each', () => {
    for (const key of ['docs', 'help'] as const) {
      expect(en[key].items.length, key).toBe(fr[key].items.length)
      expect(en[key].id, key).toBe(fr[key].id)
    }
    expect(fr.docs.items.length).toBeGreaterThanOrEqual(5)
    expect(fr.help.items.length).toBeGreaterThanOrEqual(3)
    for (const g of [fr, en]) {
      const links = [...g.docs.items, ...g.help.items].filter((i) => i.url)
      for (const i of links) {
        expect(i.url, 'a checklist link').toMatch(OFFICIAL)
        expect(i.host?.length ?? 0, `${i.url} names no publisher`).toBeGreaterThan(0)
      }
      for (const i of g.docs.items) for (const k of ['doc', 'gives', 'how'] as const) expect(i[k].trim().length, `${i.doc}.${k}`).toBeGreaterThan(0)
      expect(g.help.advice.length).toBeGreaterThan(30)
    }
    fr.docs.items.forEach((d, i) => expect(en.docs.items[i].gives, d.doc).not.toBe(d.gives))
  })

  it('explains every sigle the dictionaries use (a floor of the ones we know)', () => {
    const frAbbr = new Set(all(fr).map((t) => t.abbr))
    const enAbbr = new Set(all(en).map((t) => t.abbr))
    for (const a of ['RRQ', 'PSV', 'SRG', 'REER', 'CELI', 'FERR', 'RVER', 'RPAC', 'CRI', 'FRV', 'PBR', 'ARC', 'RREGOP', 'MGA']) expect(frAbbr.has(a), a).toBe(true)
    for (const a of ['QPP', 'OAS', 'GIS', 'RRSP', 'TFSA', 'RRIF', 'VRSP', 'PRPP', 'LIRA', 'LIF', 'ACB', 'CRA', 'RREGOP', 'YMPE']) expect(enAbbr.has(a), a).toBe(true)
  })
})

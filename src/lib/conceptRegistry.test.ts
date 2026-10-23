import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { STRATEGY_KEYS } from '../engine/bridge'
import { BALANCE_COLOUR, BALANCE_CONCEPT, EXPENSE_COLOUR, EXPENSE_CONCEPT, SOURCE_COLOUR, SOURCE_CONCEPT, seriesFor } from './chartData'
import {
  ACCOUNT_CONCEPT,
  CONCEPTS,
  DOC_CONCEPT,
  FAMILIES,
  FAMILY_FACE,
  FAMILY_HUE,
  GLOSSARY_DOC_CONCEPTS,
  GLOSSARY_GROUP_FAMILY,
  GLOSSARY_TERM_CONCEPT,
  STARTER_CONCEPT,
  STRATEGY_CONCEPT,
  type ConceptId,
} from './concepts'
import { DOC_IDS } from './facts'
import { GLOSSARY_COPY } from './glossaryCopy'
import { PIP_ICONS } from './pipIcons'
import { PIP_ICONS_MORE } from './pipIconsMore'
import { STARTER_IDS } from './plannedExpenses'
import { blankComments, readScanned, sourceFiles } from './buildGuardScan'

// THE CONCEPT REGISTRY (lib/concepts.ts): every idea the app names has ONE glyph and ONE family, a family has ONE hue, and every place
// that shows the idea — the Glossaire, a section's header, a map chip, a chart's segment — reads it from there. These tests hold the
// registry's own rules and the ties to the places that depend on it, so the glossary, the charts and the profile cannot drift apart.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const ids = Object.keys(CONCEPTS) as ConceptId[]
const MARKUP: Record<string, string> = { ...PIP_ICONS, ...PIP_ICONS_MORE }

describe('the registry', () => {
  it('draws every concept with a glyph that exists', () => {
    for (const id of ids) expect(MARKUP[CONCEPTS[id].glyph], `${id} → ${CONCEPTS[id].glyph}`).toMatch(/<path|<circle|<rect|<line|<polyline/)
  })

  it('never gives two concepts the same glyph (a glyph that means two things tells nothing)', () => {
    const seen = new Map<string, string>()
    for (const id of ids) {
      const glyph = CONCEPTS[id].glyph
      expect(seen.has(glyph), `${id} and ${seen.get(glyph)} share « ${glyph} »`).toBe(false)
      seen.set(glyph, id)
    }
  })

  it('puts every concept in a family that has a hue, and every family has a face from its own concepts', () => {
    for (const id of ids) expect(FAMILIES).toContain(CONCEPTS[id].family)
    for (const family of FAMILIES) {
      expect(FAMILY_HUE[family]).toBeTruthy()
      expect(CONCEPTS[FAMILY_FACE[family]].family).toBe(family)
    }
    expect(new Set(FAMILIES.map((f) => FAMILY_HUE[f])).size).toBe(FAMILIES.length)
  })

  it('is used: a concept nothing reads is dead data', () => {
    const readers = sourceFiles(srcDir).filter((f) => !/concepts\.ts$|conceptRegistry\.test\.ts$/.test(f) && !/\.test\.tsx?$/.test(f)).map((f) => blankComments(readScanned(f)))
    // A concept is read by its quoted id in a call site, or through one of the keyed maps below (which are in concepts.ts itself).
    const keyed = new Set<ConceptId>([
      ...Object.values(GLOSSARY_TERM_CONCEPT),
      ...GLOSSARY_DOC_CONCEPTS,
      ...Object.values(DOC_CONCEPT),
      ...Object.values(STARTER_CONCEPT),
      ...Object.values(STRATEGY_CONCEPT),
      ...Object.values(ACCOUNT_CONCEPT),
      ...Object.values(FAMILY_FACE),
      'documents',
      'aide',
    ])
    const dead = ids.filter((id) => !keyed.has(id) && !readers.some((src) => new RegExp(`['"]${id}['"]`).test(src)))
    expect(dead, 'in the registry but read by no page').toEqual([])
  })
})

describe('the keyed maps cover the app’s own unions', () => {
  it('has a concept for every strategy, document, starter and account', () => {
    expect(Object.keys(STRATEGY_CONCEPT).sort()).toEqual([...STRATEGY_KEYS].sort())
    expect(Object.keys(DOC_CONCEPT).sort()).toEqual([...DOC_IDS].sort())
    expect(Object.keys(STARTER_CONCEPT).sort()).toEqual([...STARTER_IDS].sort())
    expect(Object.keys(ACCOUNT_CONCEPT).sort()).toEqual(['nonReg', 'rrsp', 'tfsa'])
  })
})

describe('the Glossaire wears the registry', () => {
  for (const lang of ['fr', 'en'] as const) {
    const g = GLOSSARY_COPY[lang]
    it(`${lang}: every group is one family and every term has a concept of that family`, () => {
      for (const group of g.groups) {
        const family = GLOSSARY_GROUP_FAMILY[group.id]
        expect(family, `group « ${group.id} » has no family`).toBeTruthy()
        for (const term of group.terms) {
          const concept = GLOSSARY_TERM_CONCEPT[term.id]
          expect(concept, `term « ${term.id} » has no concept`).toBeTruthy()
          expect(CONCEPTS[concept].family, `« ${term.id} » sits in the « ${group.id} » group (${family})`).toBe(family)
        }
      }
    })
    it(`${lang}: the documents each have a concept, and the legend names every family`, () => {
      expect(GLOSSARY_DOC_CONCEPTS).toHaveLength(g.docs.items.length)
      expect(Object.keys(g.legend.families).sort()).toEqual([...FAMILIES].sort())
      for (const family of FAMILIES) {
        expect(g.legend.families[family].name.trim()).not.toBe('')
        expect(g.legend.families[family].what.trim()).not.toBe('')
      }
    })
  }

  it('has no concept for a term that is not in the glossary', () => {
    const terms = new Set(GLOSSARY_COPY.fr.groups.flatMap((group) => group.terms.map((t) => t.id)))
    for (const key of Object.keys(GLOSSARY_TERM_CONCEPT)) expect(terms.has(key), `« ${key} » is not a glossary term`).toBe(true)
    for (const key of Object.keys(GLOSSARY_GROUP_FAMILY)) expect(GLOSSARY_COPY.fr.groups.some((group) => group.id === key), `« ${key} » is not a group`).toBe(true)
  })
})

describe('the charts draw the registry’s hues', () => {
  const HUE_OF_SERIES: Record<string, string> = {
    sage: 'sage', 'sage-mid': 'sage', 'sage-soft': 'sage',
    accent: 'marigold', sun: 'marigold', 'accent-soft': 'marigold',
    sky: 'sky', 'sky-mid': 'sky', 'sky-soft': 'sky',
    berry: 'berry', 'berry-mid': 'berry', 'berry-soft': 'berry',
    clay: 'terracotta', coral: 'terracotta', 'clay-soft': 'terracotta',
    ink: 'ink',
  }
  const SOURCE_CONCEPTS = { work: 'salaire', db: 'employeur', rrq: 'rrq', oas: 'psv', credits: 'srg', nest: 'nid' } as const
  const BALANCE_CONCEPTS = { rrsp: 'reer', rrspLocked: 'verrouille', tfsa: 'celi', nonReg: 'nonEnregistre', home: 'maison' } as const
  const EXPENSE_CONCEPTS = { living: 'budget', children: 'enfants', events: 'evenements', mortgage: 'hypotheque', tax: 'impot', deductions: 'salaire', saved: 'reer', unmet: 'depenses' } as const

  // The legends wear these concepts' pips: the maps the charts read must say the same as this table.
  it('the segments name the concepts their legends show', () => {
    expect(SOURCE_CONCEPT).toEqual(SOURCE_CONCEPTS)
    expect(BALANCE_CONCEPT).toEqual(BALANCE_CONCEPTS)
    expect(EXPENSE_CONCEPT).toEqual(EXPENSE_CONCEPTS)
  })

  const cases = [
    ['the sources', SOURCE_COLOUR, SOURCE_CONCEPTS],
    ['the balances', BALANCE_COLOUR, BALANCE_CONCEPTS],
    ['the spending', EXPENSE_COLOUR, EXPENSE_CONCEPTS],
  ] as const
  for (const [name, colours, concepts] of cases) {
    it(`${name}: each segment wears its concept's family hue, and no two segments share a colour`, () => {
      const used = new Set<string>()
      for (const segment of Object.keys(colours)) {
        const colour = (colours as Record<string, string>)[segment]
        const concept = (concepts as Record<string, ConceptId>)[segment]
        expect(HUE_OF_SERIES[colour], `${segment}: ${colour}`).toBe(FAMILY_HUE[CONCEPTS[concept].family])
        expect(used.has(colour), `${segment} repeats ${colour}`).toBe(false)
        used.add(colour)
      }
    })
  }

  it('gives siblings of one family three tellable tiers', () => {
    expect(new Set((['deep', 'mid', 'soft'] as const).map((t) => seriesFor('reer', t))).size).toBe(3)
  })
})

import { describe, expect, it } from 'vitest'
import { EXAMPLE_IDS, EXAMPLES } from '../engine/golden/examples.ts'
import { EXAMPLE_COPY } from './exampleCopy.ts'
import { exampleProfile } from './example.ts'
import { validateProfile } from './schema.ts'

describe('the example households', () => {
  it('each has a name and a story in both languages, and the story names the people it is about', () => {
    for (const lang of ['fr', 'en'] as const) {
      expect(Object.keys(EXAMPLE_COPY[lang]).sort()).toEqual([...EXAMPLE_IDS].sort())
      for (const id of EXAMPLE_IDS) {
        const c = EXAMPLE_COPY[lang][id]
        expect(c.name.trim(), `${lang} ${id} name`).not.toBe('')
        for (const p of EXAMPLES[id].household.persons) expect(c.story, `${lang} ${id}`).toContain(p.name)
      }
    }
    const names = EXAMPLE_IDS.map((id) => EXAMPLE_COPY.fr[id].name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('every example loads as a valid, current profile', () => {
    for (const id of EXAMPLE_IDS) {
      const r = validateProfile(exampleProfile(id))
      expect(r.ok, `${id}: ${JSON.stringify(r.ok ? '' : r.problems)}`).toBe(true)
    }
  })
})

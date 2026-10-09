import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { addChild } from './profileEdit.ts'
import { addHome } from './profileEdit.ts'
import { applies, clearTopic, docApplies, hasData, lostBy, PERSON_TOPICS } from './situation.ts'
import { defaultProfile, SCHEMA_VERSION, type Profile } from './schema.ts'

// « MA SITUATION »: what each topic holds, what a « no » would erase, and which documents matter to a household that said so.

const dir = dirname(fileURLToPath(import.meta.url))
const golden = (): Profile => JSON.parse(readFileSync(join(dir, 'fixtures', `profile.v${SCHEMA_VERSION}.json`), 'utf8'))
const none: ReadonlySet<string> = new Set()

describe('a household with nothing to say', () => {
  const blank = defaultProfile({ year: 2026 })
  it('has no data for any topic, so the form shows none of them', () => {
    for (const topic of ['kids', 'home', 'events'] as const) expect(applies(blank, none, topic), topic).toBe(false)
    for (const topic of PERSON_TOPICS) expect(applies(blank, none, topic, 'self'), topic).toBe(false)
  })

  it('shows a topic once its answer is yes, with nothing typed yet', () => {
    expect(applies(blank, new Set(['kids']), 'kids')).toBe(true)
    expect(applies(blank, new Set(['pension:self']), 'pension', 'self')).toBe(true)
    expect(applies(blank, new Set(['pension:self']), 'pension', 'spouse')).toBe(false) // one person's answer is not the other's
  })

  it('asks only what matters to it of the documents: the budget, the tax notice, the accounts and the QPP statement', () => {
    expect(docApplies(blank, none, 'budget')).toBe(true)
    for (const doc of ['home', 'employer', 'residence'] as const) expect(docApplies(blank, none, doc, 'self'), doc).toBe(false)
    expect(docApplies(blank, new Set(['abroad:self']), 'residence', 'self')).toBe(true)
  })
})

describe('what is already in the profile shows without an answer', () => {
  it('children, a home, a plan, a later arrival, work kept after retiring', () => {
    let p = addChild(defaultProfile({ year: 2026 }), 2020)
    expect(hasData(p, 'kids')).toBe(true)
    p = addHome(p)
    expect(hasData(p, 'home')).toBe(true)
    const me = p.household.persons[0]
    const later = { ...p, household: { ...p.household, persons: [{ ...me, oas: { ...me.oas, residentSince: me.birth.year + 25 }, partTime: { untilAge: 67, share: 0.3 } }] } }
    expect(hasData(later, 'abroad', 'self')).toBe(true)
    expect(hasData(later, 'partTime', 'self')).toBe(true)
  })

  it('the committed household: whatever it holds shows, and nothing it lacks does', () => {
    const g = golden()
    for (const person of g.household.persons) expect(hasData(g, 'pension', person.id), person.id).toBe(person.pensions.length > 0)
    expect(hasData(g, 'home')).toBe(g.household.home != null)
  })
})

describe('a « no » over typed figures', () => {
  it('counts what it would erase, and erases exactly that — nothing, when there is nothing', () => {
    const blank = defaultProfile({ year: 2026 })
    expect(lostBy(blank, 'kids')).toBe(0)
    expect(clearTopic(blank, 'kids')).toBe(blank) // the same profile back: nothing to ask
    const withKids = addChild(addChild(blank, 2019), 2022)
    expect(lostBy(withKids, 'kids')).toBe(2)
    expect(clearTopic(withKids, 'kids').household.children).toEqual([])
    const home = addHome(blank)
    expect(lostBy(home, 'home')).toBe(1)
    expect(clearTopic(home, 'home').household.home ?? null).toBeNull()
  })

  it('a lifelong residence is restored, not just blanked: the arrival year goes and the OAS counts from 18 again', () => {
    const blank = defaultProfile({ year: 2026 })
    const me = blank.household.persons[0]
    const later = { ...blank, household: { ...blank.household, persons: [{ ...me, oas: { ...me.oas, residentSince: me.birth.year + 30 } }] } }
    const cleared = clearTopic(later, 'abroad', 'self')
    expect(cleared.household.persons[0].oas.residentSince).toBe(me.birth.year + 18)
    expect(hasData(cleared, 'abroad', 'self')).toBe(false)
  })
})

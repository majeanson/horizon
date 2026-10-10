import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { accuracyOf, DOC_IDS, factId, factsOf, FACT_ID_PATTERN } from './facts.ts'
import { migrateProfile } from './migrations.ts'
import { addHome, addSpouse, removeSpouse, setFact, setFacts, toggleFact, updateHome } from './profileEdit.ts'
import { defaultProfile, SCHEMA_VERSION, validateProfile, type Profile } from './schema.ts'

// WHICH FIGURES ARE REAL: the list of facts a household has, the document that holds each, and what the meter counts.

const dir = dirname(fileURLToPath(import.meta.url))
const golden = (): Profile => JSON.parse(readFileSync(join(dir, 'fixtures', `profile.v${SCHEMA_VERSION}.json`), 'utf8'))
const TODAY = { year: 2026 }
const valid = (p: Profile) => expect(validateProfile(p).ok, JSON.stringify(validateProfile(p))).toBe(true)

describe('the facts a household has', () => {
  it('a person alone: the figures every person has, and none that need something they do not have', () => {
    const p = defaultProfile(TODAY) // no salary, no pension, no home, nothing in the non-registered account
    const kinds = factsOf(p).map((f) => f.kind)
    expect(kinds).toEqual(['earnings', 'rrspBalance', 'rrspRoom', 'tfsaBalance', 'tfsaRoom', 'spendingWorking', 'spendingRetired'])
    expect(kinds).not.toContain('salary')
    expect(kinds).not.toContain('nonRegBalance') // nothing held outside the REER and the CELI: nothing to read
    expect(kinds).not.toContain('nonRegAcb')
    expect(kinds).not.toContain('pension')
    expect(kinds).not.toContain('mortgage')
    expect(kinds).not.toContain('residence') // lived here since 18: the OAS counts from there, nothing to read
  })

  it('the non-registered balance is a figure only for someone who holds money outside the REER and the CELI', () => {
    const p = defaultProfile(TODAY)
    const me = p.household.persons[0]
    const holding = (patch: Partial<typeof me.accounts.nonReg>) => ({ ...p, household: { ...p.household, persons: [{ ...me, accounts: { ...me.accounts, nonReg: { ...me.accounts.nonReg, ...patch } } }] } })
    for (const patch of [{ balance: 10_000 }, { annualContribution: 2_000 }, { acb: 5_000 }]) expect(factsOf(holding(patch)).map((f) => f.kind), JSON.stringify(patch)).toContain('nonRegBalance')
    expect(factsOf(holding({})).map((f) => f.kind)).not.toContain('nonRegBalance')
  })

  it('the residence is a figure only for someone whose residence began after their 18th birthday', () => {
    const p = defaultProfile(TODAY)
    const me = p.household.persons[0]
    const later = { ...p, household: { ...p.household, persons: [{ ...me, oas: { ...me.oas, residentSince: me.birth.year + 25 } }] } }
    expect(factsOf(later).map((f) => f.kind)).toContain('residence')
  })

  it('a figure appears when the thing it describes does: a salary, a cost base, a plan, a home, a loan', () => {
    let p = defaultProfile(TODAY)
    p = { ...p, household: { ...p.household, persons: [{ ...p.household.persons[0], salaryToday: 80_000, accounts: { ...p.household.persons[0].accounts, nonReg: { balance: 10_000, acb: 8_000, annualContribution: 0 } } }] } }
    expect(factsOf(p).map((f) => f.kind)).toEqual(expect.arrayContaining(['salary', 'nonRegAcb']))
    p = addHome(p)
    expect(factsOf(p).map((f) => f.kind)).toContain('homeValue')
    expect(factsOf(p).map((f) => f.kind)).not.toContain('mortgage') // a home with no mortgage has no loan to read
    p = updateHome(p, (h) => ({ ...h, mortgage: { ...h.mortgage, balance: 120_000 } }))
    expect(factsOf(p).map((f) => f.kind)).toContain('mortgage')
    const withPlan = golden()
    expect(factsOf(withPlan).some((f) => f.kind === 'pension')).toBe(true) // the golden couple has an employer plan
  })

  it('a couple has each person’s figures, in the order of the form, then the household’s', () => {
    const couple = addSpouse(defaultProfile(TODAY), TODAY)
    const owners = factsOf(couple).map((f) => f.owner)
    expect(owners.indexOf('spouse')).toBeGreaterThan(owners.indexOf('self'))
    expect(owners.lastIndexOf('self')).toBeLessThan(owners.indexOf('spouse'))
    expect(owners.indexOf('household')).toBeGreaterThan(owners.lastIndexOf('spouse'))
    expect(new Set(factsOf(couple).map((f) => f.id)).size).toBe(factsOf(couple).length)
  })

  it('every fact belongs to a document, and every document holds at least one', () => {
    const everything = golden()
    const withHome = updateHome(addHome(everything), (h) => ({ ...h, mortgage: { ...h.mortgage, balance: 1 } }))
    // … and someone who arrived after 18, so the proof of residence is asked for too
    const arrived = { ...withHome, household: { ...withHome.household, persons: withHome.household.persons.map((x, i) => (i === 0 ? { ...x, oas: { ...x.oas, residentSince: x.birth.year + 25 } } : x)) } }
    const docs = new Set(factsOf(arrived).map((f) => f.doc))
    for (const d of DOC_IDS) expect(docs.has(d), d).toBe(true)
  })
})

describe('confirming', () => {
  it('nothing is confirmed until the person says so; a figure can be confirmed and taken back; the same profile comes back when nothing changes', () => {
    const p = golden()
    expect(accuracyOf(p).confirmed).toBe(0)
    expect(accuracyOf(p).total).toBeGreaterThan(8)
    const id = factId('self', 'rrspBalance')
    const yes = setFact(p, id, true)
    expect(yes).not.toBe(p)
    expect(factsOf(yes).find((f) => f.id === id)!.confirmed).toBe(true)
    expect(accuracyOf(yes).confirmed).toBe(1)
    expect(setFact(yes, id, true)).toBe(yes)
    expect(setFact(p, id, false)).toBe(p)
    expect(toggleFact(yes, id).confirmed).toEqual([])
    valid(yes)
  })

  it('the meter counts per document, and several figures confirm at once', () => {
    const p = golden()
    const bank = factsOf(p).filter((f) => f.doc === 'bank').map((f) => f.id)
    const done = setFacts(p, bank, true)
    const a = accuracyOf(done)
    expect(a.byDoc.bank.confirmed).toBe(a.byDoc.bank.total)
    expect(a.byDoc.tax.confirmed).toBe(0)
    expect(a.confirmed).toBe(bank.length)
    expect(setFacts(done, bank, true)).toBe(done)
  })

  it('a confirmed figure that no longer applies is not counted (the cost base once the account is emptied)', () => {
    let p = golden()
    p = { ...p, household: { ...p.household, persons: p.household.persons.map((x, i) => (i === 0 ? { ...x, accounts: { ...x.accounts, nonReg: { balance: 5_000, acb: 4_000, annualContribution: 0 } } } : x)) } }
    const acb = factId('self', 'nonRegAcb')
    p = setFact(p, acb, true)
    expect(accuracyOf(p).confirmed).toBe(1)
    const emptied = { ...p, household: { ...p.household, persons: p.household.persons.map((x, i) => (i === 0 ? { ...x, accounts: { ...x.accounts, nonReg: { balance: 0, acb: 0, annualContribution: 0 } } } : x)) } }
    expect(accuracyOf(emptied).confirmed).toBe(0)
  })

  it('what was confirmed about a spouse goes when the spouse does', () => {
    let p = addSpouse(defaultProfile(TODAY), TODAY)
    p = setFacts(p, [factId('self', 'earnings'), factId('spouse', 'earnings'), factId('household', 'spendingWorking')], true)
    expect(removeSpouse(p).confirmed).toEqual([factId('self', 'earnings'), factId('household', 'spendingWorking')])
  })
})

describe('saved with the profile', () => {
  it('confirmed figures survive a validate round trip; a malformed id is refused; duplicates collapse', () => {
    const p = setFacts(golden(), [factId('self', 'earnings'), factId('household', 'spendingRetired')], true)
    const read = validateProfile(JSON.parse(JSON.stringify(p)))
    expect(read.ok && read.profile.confirmed).toEqual(p.confirmed)
    const bad = JSON.parse(JSON.stringify(p))
    bad.confirmed.push('nobody:earnings', 'self:rm -rf /', 42)
    const refused = validateProfile(bad)
    expect(refused.ok).toBe(false)
    const dup = JSON.parse(JSON.stringify(p))
    dup.confirmed.push(dup.confirmed[0])
    const collapsed = validateProfile(dup)
    expect(collapsed.ok && collapsed.profile.confirmed).toEqual(p.confirmed)
    expect(FACT_ID_PATTERN.test('self:rrspBalance')).toBe(true)
    expect(FACT_ID_PATTERN.test('self:')).toBe(false)
  })

  it('a version-8 file opens with nothing confirmed', () => {
    const old = JSON.parse(readFileSync(join(dir, 'fixtures', 'profile.v8.json'), 'utf8'))
    const read = migrateProfile(old)
    expect(read.ok && read.profile.confirmed).toEqual([])
  })
})

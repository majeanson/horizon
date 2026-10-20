import { describe, expect, it } from 'vitest'
import { readBank } from './bankImport.ts'
import { canUndo } from './fillUndo.ts'
import { factId } from './facts.ts'
import { parseDecimal, parseMoney } from './money.ts'
import { readNumber } from './numberInput.ts'
import { parseAmount } from './pasteEarnings.ts'
import { addHome, addPension, addSpouse, blankPension, mapPerson, removeHome, removePensionOf, setAssumptions, setBirthYear, setFact, setSpending } from './profileEdit.ts'
import { addFlow, partTimeSeed, setSplitRow, updateFlow } from './profileLife.ts'
import { defaultProfile, validateProfile, type Profile } from './schema.ts'
import { clearTopic } from './situation.ts'

// THE PROFILE'S WAY IN, second pass (the cloud review of 2026-10-19): every way a person's typing, a fill or an import could still leave the profile in a
// shape the schema refuses — one refused figure stops every save after it — or throw away what they did, each pinned by the case that showed it.

const TODAY = { year: 2026 }
const valid = (p: Profile) => expect(validateProfile(JSON.parse(JSON.stringify(p))).ok, JSON.stringify(validateProfile(JSON.parse(JSON.stringify(p))))).toBe(true)
const couple = () => addSpouse(defaultProfile(TODAY), TODAY)
const withSplit = (p: Profile, rows: { id: 'joint' | 'self' | 'spouse'; working: number; retired: number }[]): Profile => ({ ...p, household: { ...p.household, spendingSplit: { rows } } })

describe('« Annuler » after a fill takes back only the fill', () => {
  it('while what the fill produced is still on screen, and never after anything else changed', () => {
    const before = defaultProfile(TODAY)
    const after = { ...before }
    const done = { note: 'rempli', before, after }
    expect(canUndo(done, after)).toBe(true)
    expect(canUndo(done, { ...after })).toBe(false) // any later edit makes a new profile
    expect(canUndo({ note: 'rien', before: null, after: null }, after)).toBe(false)
    expect(canUndo(null, after)).toBe(false)
  })
})

describe('a box that holds only separators is not a number', () => {
  it('« , », « ,, », « $, » are refused — never NaN, which a box would have saved', () => {
    for (const t of [',', ',,', '$,', ' , ', '.,']) {
      expect(parseMoney(t), t).toBeNull()
      expect(readNumber(t, 'money', false), t).toBeNull()
    }
    expect(readNumber(',', 'percent', true)).toBeNull()
  })
})

describe('no edit seeds a figure the schema refuses', () => {
  it('part-time work turned on by someone who retires at 45 starts at 50 (the schema keeps 50 to 80)', () => {
    expect([40, 45, 46, 47, 60, 79].map(partTimeSeed)).toEqual([50, 50, 50, 50, 63, 80])
  })
  it('a lifelong resident’s year never passes 2100, whatever birth year is typed', () => {
    const p = defaultProfile(TODAY)
    const lifelong = { ...p.household.persons[0], oas: { ...p.household.persons[0].oas, residentSince: p.household.persons[0].birth.year + 18 } }
    const moved = setBirthYear(lifelong, 2095)
    expect(moved.oas.residentSince).toBeLessThanOrEqual(2100)
    valid({ ...p, household: { ...p.household, persons: [moved] } })
  })
  it('three budget parts at their box’s maximum never sum past what the profile keeps', () => {
    const p = withSplit(couple(), [{ id: 'joint', working: 0, retired: 0 }, { id: 'self', working: 0, retired: 0 }, { id: 'spouse', working: 0, retired: 0 }])
    const full = (['joint', 'self', 'spouse'] as const).reduce((q, id) => setSplitRow(q, id, { working: 1e8 }), p)
    expect(full.household.spending.workingToday).toBeLessThanOrEqual(1e8)
    valid(full)
  })
  it('spreading a total over the parts never leaves a part below 0 (the cent of rounding goes where it can)', () => {
    // joint 0, self 1 000 $, spouse 31 000 $: a 50 500 $ total rounds both parts UP on an exact half-cent — the cent to take back cannot come from joint
    const p = withSplit(couple(), [{ id: 'joint', working: 0, retired: 0 }, { id: 'self', working: 0, retired: 1_000 }, { id: 'spouse', working: 0, retired: 31_000 }])
    const out = setSpending(p, { retiredToday: 50_500 })
    expect(out.household.spendingSplit!.rows.every((r) => r.retired >= 0)).toBe(true)
    expect(out.household.spending.retiredToday).toBeCloseTo(50_500, 2)
    valid(out)
  })
})

describe('a bank export opened by a preamble', () => {
  it('a semicolon file whose first line is an account line is still read', () => {
    const csv = 'Compte 12345 — Données en date du 2026-10-19\nDate;Description;Montant\n2026-10-01;Épicerie;-82,10\n2026-10-02;Paie;1500,00'
    expect(readBank(csv).rows.map((r) => r.amount)).toEqual([-82.1, 1500])
  })
  it('and a tab file too', () => {
    expect(readBank('Relevé de compte\nDate\tDescription\tMontant\n2026-10-01\tCafé\t-4,50').rows.map((r) => r.amount)).toEqual([-4.5])
  })
})

describe('a removal takes its « confirmed » marks with it', () => {
  it('the home: added back, its figures are blank AND unconfirmed', () => {
    const p = setFact(setFact(addHome(defaultProfile(TODAY)), factId('household', 'homeValue'), true), factId('household', 'mortgage'), true)
    expect(p.confirmed).toEqual(expect.arrayContaining(['household:homeValue']))
    const back = addHome(removeHome(p))
    expect(back.confirmed).not.toContain('household:homeValue')
    expect(back.confirmed).not.toContain('household:mortgage')
  })
  it('a topic answered « non » (a plan, money outside the accounts), and the last plan removed', () => {
    const base = mapPerson(defaultProfile(TODAY), 'self', (x) => addPension(x, blankPension()))
    const p = setFact(base, factId('self', 'pension'), true)
    expect(clearTopic(p, 'pension', 'self').confirmed).not.toContain('self:pension')
    expect(removePensionOf(p, 'self', 0).confirmed).not.toContain('self:pension')
    const nonReg = setFact(mapPerson(defaultProfile(TODAY), 'self', (x) => ({ ...x, accounts: { ...x.accounts, nonReg: { balance: 10_000, acb: 8_000, annualContribution: 0 } } })), factId('self', 'nonRegBalance'), true)
    expect(clearTopic(nonReg, 'nonReg', 'self').confirmed).not.toContain('self:nonRegBalance')
  })
  it('a mark whose figure still applies, or of a kind it does not know, is kept', () => {
    const paid = mapPerson(defaultProfile(TODAY), 'self', (x) => ({ ...x, salaryToday: 60_000 })) // a salary: its fact applies
    const p = setFact(paid, factId('self', 'salary'), true)
    expect(removeHome(addHome(p)).confirmed).toContain('self:salary')
  })
})

describe('an edit that changes nothing returns the same profile', () => {
  it('setAssumptions, setSpending, updateFlow, setSplitRow — so the store skips the render, the save and the backup stamp', () => {
    const p = defaultProfile(TODAY)
    expect(setAssumptions(p, { inflation: p.assumptions.inflation })).toBe(p)
    expect(setAssumptions(p, { returns: { ...p.assumptions.returns } })).toBe(p)
    expect(setSpending(p, { workingToday: p.household.spending.workingToday })).toBe(p)
    const withFlow = addFlow(p, { label: 'Toit', kind: 'expense', amount: 12_000, fromYear: 2030, toYear: 2030, owner: 'self', taxable: false })
    expect(withFlow.household.flows).toHaveLength(1)
    expect(updateFlow(withFlow, 0, (f) => f)).toBe(withFlow)
    const split = withSplit(couple(), [{ id: 'joint', working: 100, retired: 100 }, { id: 'self', working: 0, retired: 0 }, { id: 'spouse', working: 0, retired: 0 }])
    expect(setSplitRow(split, 'joint', { working: 100 })).toBe(split)
    // and an edit that does change something still does
    expect(setAssumptions(p, { inflation: p.assumptions.inflation + 0.01 })).not.toBe(p)
  })
})

describe('one number parser', () => {
  it('a pasted amount is read by the same rules as a typed one — « 1.234 » pasted means a thousand (dotThousands), typed a decimal', () => {
    expect(parseAmount('1.234')).toBe(1234)
    expect(parseDecimal('1.234', { dotThousands: true })).toBe(1234)
    expect(parseDecimal('1.234')).toBe(1.23)
    for (const [t, n] of [['52 300,50 $', 52300.5], ['52,300.50', 52300.5], ['52.300,50', 52300.5], ['1 234', 1234], ['52,300', 52300], ['-45,00', -45], ['1.234.567', 1234567], ['CAD 12,50', 12.5]] as const) expect(parseAmount(t), t).toBe(n)
  })
})

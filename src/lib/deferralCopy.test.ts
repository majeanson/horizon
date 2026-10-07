import { describe, expect, it, vi } from 'vitest'
import { deferralView, RRQ_START_AGES } from '../engine/deferral.ts'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { DEFERRAL_COPY, versusCell, type DeferralCopy } from './deferralCopy.ts'
import { formatPct } from './format.ts'

// The words of « Quand commencer ma rente ? » live outside the eager dictionaries (a budget reason: deferralCopy.ts),
// so the dictionary parity test does not see them. This one does the same job for them: every text present in both
// languages, none empty, none left in the other language, and the claims the copy makes are the ones the engine tests pin.

const { fr, en } = DEFERRAL_COPY

/** Every text the copy can print, rendered with sample arguments. */
function texts(c: DeferralCopy): [string, string][] {
  const out: [string, string][] = []
  for (const [k, v] of Object.entries(c)) {
    if (typeof v === 'string') out.push([k, v])
    else if (Array.isArray(v)) v.forEach((line, i) => out.push([`${k}.${i}`, line]))
    else out.push([k, (v as (...a: unknown[]) => string)(2, '58,8 %')])
  }
  return out
}

describe('the deferral copy, in both languages', () => {
  it('has the same keys, and no text is empty', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
    for (const c of [fr, en]) for (const [k, v] of texts(c)) expect(v.trim().length, k).toBeGreaterThan(0)
    expect(en.why.length).toBe(fr.why.length)
    expect(en.against.length).toBe(fr.against.length)
  })

  it('English is not French pasted in: every sentence-length text differs between the languages', () => {
    const frTexts = new Map(texts(fr))
    for (const [k, v] of texts(en)) if (v.length > 40) expect(v, k).not.toBe(frTexts.get(k))
  })

  it('says what the engine pins: the QPP can start at 72, the OAS at 70, and the pension is indexed and for life', () => {
    expect(Math.max(...RRQ_START_AGES)).toBe(72)
    expect(fr.whyLead('58,8 %', '36 %')).toContain('72 ans')
    expect(fr.whyLead('58,8 %', '36 %')).toContain('70 ans')
    expect(en.whyLead('58.8%', '36%')).toContain('(at 72)')
    expect(en.whyLead('58.8%', '36%')).toContain('(at 70)')
  })

  it('names the two reasons NOT to defer that change a result: the GIS goes with the OAS, and the break-even is a bet on life', () => {
    expect(fr.against.join(' ')).toContain('Supplément de revenu garanti')
    expect(en.against.join(' ')).toContain('Guaranteed Income Supplement')
    expect(fr.against[0]).toContain('point d’équilibre')
    expect(en.against[0]).toContain('break-even')
  })

  it('says plainly what it leaves out: before tax, one pension changed at a time, no survivor pension', () => {
    expect(fr.caveat).toContain('avant impôt')
    expect(fr.caveat).toContain('conjoint survivant')
    expect(en.caveat).toContain('before tax')
    expect(en.caveat).toContain('survivor')
  })
})

describe('the « against 65 » cell never contradicts the amounts beside it', () => {
  vi.setConfig({ testTimeout: 60_000 })
  const alone = { livesAlone: true, persons: [GOLDEN_HOUSEHOLD.persons[0]], spending: GOLDEN_HOUSEHOLD.spending }
  const me = deferralView(alone, GOLDEN_ASSUMPTIONS).persons[0]
  const pct = (x: number) => formatPct(x, 'fr', 1)
  const norm = (t: string) => t.replace(/[  ]/g, ' ')

  it('QPP: the rule\'s +42,0 % AND the change in the monthly amount (the economy\'s part included) are both printed, and the second is what the two amounts show', () => {
    const base = me.rrq.find((o) => o.age === 65)!
    const o = me.rrq.find((o) => o.age === 70)!
    const cell = norm(versusCell(fr, o, pct))
    expect(cell).toContain(norm(fr.versusMore(pct(o.versus65)))) // +42,0 %
    expect(cell).toContain(norm(fr.versusMore(pct(o.monthly / base.monthly - 1)))) // what 1 782 $ against 1 195 $ really is
    expect(o.monthly / base.monthly - 1).toBeGreaterThan(o.versus65) // later start = higher wage index
  })

  it('every row prints a percentage that is either the rule\'s or the amounts\' own (before the fix: +42 % beside 1 195 → 1 782 $, which is +49 %)', () => {
    for (const kind of ['rrq', 'oas'] as const) {
      const rows = me[kind]
      const base = rows.find((o) => o.age === 65)!
      for (const o of rows) {
        if (o.age === 65) continue
        expect(o.change, `${kind} ${o.age}`).toBeCloseTo(o.monthly / base.monthly - 1, 10)
        const cell = norm(versusCell(en, o, (x) => formatPct(x, 'en', 1)))
        expect(cell, `${kind} ${o.age}`).toContain(norm(formatPct(Math.abs(o.change), 'en', 1)))
      }
    }
  })

  it('the OAS has no wage index: one figure, not two', () => {
    const o = me.oas.find((x) => x.age === 70)!
    expect(Math.abs(o.change - o.versus65)).toBeLessThan(0.0005)
    expect(versusCell(fr, o, pct)).not.toContain('·')
  })
})

describe('canary: the « not French pasted in » check can fail', () => {
  it('French used as the English copy is caught by the very comparison the real test makes', () => {
    const frTexts = new Map(texts(fr))
    const pastedIn = texts(fr).filter(([k, v]) => v.length > 40 && v === frTexts.get(k))
    expect(pastedIn.length).toBeGreaterThan(3)
    expect(texts(en).filter(([k, v]) => v.length > 40 && v === frTexts.get(k))).toEqual([])
  })
})

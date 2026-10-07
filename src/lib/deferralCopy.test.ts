import { describe, expect, it } from 'vitest'
import { RRQ_START_AGES } from '../engine/deferral.ts'
import { DEFERRAL_COPY, type DeferralCopy } from './deferralCopy.ts'

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

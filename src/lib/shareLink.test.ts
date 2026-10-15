import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SHARE_COPY } from './shareCopy'
import { OG_PATH, SHARE_MAX_AGE, SHARE_MIN_AGE, SHARE_PATH, allShares, ogFile, ogGenericFile, ogUrl, parseShare, shareUrl } from './shareLink'
import { MAX_AGE, MIN_AGE } from './resultsModel'

const ogDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'og')

describe('share link', () => {
  it('restates the engine\'s age bounds (the Worker cannot import them)', () => {
    expect([SHARE_MIN_AGE, SHARE_MAX_AGE]).toEqual([MIN_AGE, MAX_AGE])
  })

  it('round-trips every result the app can state', () => {
    for (const s of allShares()) expect(parseShare(new URL(shareUrl('https://x.test', s)).searchParams)).toEqual(s)
  })

  it('writes exactly three parameters: an age, a household type, a language — and nothing else', () => {
    const url = new URL(shareUrl('https://retraite.marcportal.com', { age: 62, home: 'couple', lang: 'fr' }))
    expect(url.pathname).toBe(SHARE_PATH)
    expect([...url.searchParams.keys()]).toEqual(['age', 'foyer', 'l'])
    expect(url.search).toBe('?age=62&foyer=couple&l=fr')
    const og = new URL(ogUrl('https://retraite.marcportal.com', { age: 62, home: 'couple', lang: 'fr' }))
    expect(og.pathname).toBe(OG_PATH)
    expect(og.search).toBe(url.search)
  })

  it('rejects an address that is not a result, so nothing odd is ever drawn or echoed', () => {
    for (const bad of ['', 'age=62', 'foyer=couple', 'age=62&foyer=trio', 'age=17&foyer=seul', 'age=71&foyer=seul', 'age=6&foyer=seul', 'age=062&foyer=seul', 'age=6e1&foyer=seul', 'age=62.5&foyer=seul', 'age=-62&foyer=seul', 'age=%3Cb%3E&foyer=seul', 'age=62&foyer=%3Cb%3E'])
      expect(parseShare(bad), bad).toBeNull()
  })

  it('reads the language leniently (French unless English is asked) and ignores unknown parameters', () => {
    expect(parseShare('age=65&foyer=seul')?.lang).toBe('fr')
    expect(parseShare('age=65&foyer=seul&l=en')?.lang).toBe('en')
    expect(parseShare('age=65&foyer=seul&l=de&revenu=90000')).toEqual({ age: 65, home: 'seul', lang: 'fr' })
  })
})

describe('the card images', () => {
  const files = readdirSync(ogDir).filter((f) => f.endsWith('.png'))

  it('has one card per result and one generic card per language — no more, no fewer (npm run og)', () => {
    const wanted = new Set([...allShares().map(ogFile), ogGenericFile('fr'), ogGenericFile('en')].map((f) => f.replace('/og/', '')))
    expect(new Set(files)).toEqual(wanted)
  })

  it('every card is a 1200 × 630 PNG', () => {
    for (const f of files) {
      const head = readFileSync(join(ogDir, f)).subarray(0, 24)
      expect(head.subarray(1, 4).toString('latin1'), f).toBe('PNG')
      expect([head.readUInt32BE(16), head.readUInt32BE(20)], f).toEqual([1200, 630])
    }
  })
})

describe('the copy', () => {
  it('names the age in both languages and speaks for a couple and for one person', () => {
    for (const lang of ['fr', 'en'] as const) {
      const c = SHARE_COPY[lang]
      expect(c.ogTitle(62)).toContain('62')
      expect(c.cardAge(62)).toContain('62')
      expect(c.ogDescription('couple')).not.toBe(c.ogDescription('seul'))
      expect(c.home.couple).not.toBe(c.home.seul)
    }
  })

  it('the English is not the French', () => {
    const { fr, en } = SHARE_COPY
    for (const k of ['button', 'copied', 'pageTitle', 'frame', 'holds', 'cta', 'cardNote'] as const) expect(en[k], k).not.toBe(fr[k])
  })
})

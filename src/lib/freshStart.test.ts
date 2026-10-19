import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getContrast, getTextScale, setContrast, setTextScale } from './accessibility.ts'
import { readScanned, sourceFiles } from './buildGuardScan.ts'
import { exampleProfile } from './example.ts'
import { KEPT_ON_FRESH_START, freshStart, profileLooksReal } from './freshStart.ts'
import { FRESH_START_COPY } from './freshStartCopy.ts'
import { defaultProfile } from './schema.ts'
import { getProfile, replaceProfile } from './store.ts'
import { getTimeBudget, setTimeBudget } from './timeBudget.ts'
import { today } from './today.ts'

// « REPARTIR À NEUF »: the device as a first visit finds it — every key but the language, the in-memory copies with them — and the question of whether
// to ask first. Plus the guard that makes the prefix sweep honest: every key the app writes to this device starts with « horizon- ».

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')

function horizonKeys(storage: Storage): string[] {
  const out: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i)
    if (k !== null && k.startsWith('horizon-')) out.push(k)
  }
  return out.sort()
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  setContrast('normal')
  setTextScale('normal')
  replaceProfile(defaultProfile(today()))
})

describe('whether a profile looks like somebody’s', () => {
  it('a blank one does not; a name, a figure, a second person, a child, a plan or a confirmed figure does', () => {
    const blank = defaultProfile(today())
    expect(profileLooksReal(blank)).toBe(false)
    const self = blank.household.persons[0]
    const withPerson = (x: Partial<typeof self>) => ({ ...blank, household: { ...blank.household, persons: [{ ...self, ...x }] } })
    expect(profileLooksReal(withPerson({ name: 'Marie' }))).toBe(true)
    expect(profileLooksReal(withPerson({ salaryToday: 52_000 }))).toBe(true)
    expect(profileLooksReal(withPerson({ earningsHistory: { 2019: 48_000 } }))).toBe(true)
    expect(profileLooksReal(withPerson({ accounts: { ...self.accounts, tfsa: { ...self.accounts.tfsa, balance: 1_500 } } }))).toBe(true)
    // a different year of birth alone is still a blank profile
    expect(profileLooksReal(withPerson({ birth: { year: 1970, month: 6 } }))).toBe(false)
    expect(profileLooksReal({ ...blank, household: { ...blank.household, children: [2015] } })).toBe(true)
    expect(profileLooksReal({ ...blank, household: { ...blank.household, spending: { workingToday: 40_000, retiredToday: 0 } } })).toBe(true)
    expect(profileLooksReal({ ...blank, confirmed: ['self:salary'] })).toBe(true)
    expect(profileLooksReal(exampleProfile('golden'))).toBe(true)
  })
})

describe('the fresh start', () => {
  it('forgets everything on the device but the language, resets what is held in memory, and the time once chosen with it', () => {
    replaceProfile(exampleProfile('golden'))
    setTimeBudget('2')
    setContrast('high')
    setTextScale('x-large')
    localStorage.setItem('horizon-lang', 'en')
    localStorage.setItem('horizon-situation', '["kids"]')
    localStorage.setItem('horizon-install', 'later')
    sessionStorage.setItem('horizon-drip-later', '1')
    expect(horizonKeys(localStorage).length).toBeGreaterThanOrEqual(5)

    freshStart()

    expect(getProfile()).toEqual(defaultProfile(today()))
    expect(getTimeBudget()).toBeNull()
    expect(getContrast()).toBe('normal')
    expect(getTextScale()).toBe('normal')
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(day|night)$/)
    expect(horizonKeys(localStorage)).toEqual(['horizon-lang'])
    expect(localStorage.getItem('horizon-lang')).toBe('en')
    expect(horizonKeys(sessionStorage)).toEqual([])
  })

  it('a refused storage does not throw', () => {
    for (const m of ['getItem', 'setItem', 'removeItem', 'key'] as const) {
      vi.spyOn(Storage.prototype, m).mockImplementation(() => {
        throw new Error('blocked')
      })
    }
    expect(() => freshStart()).not.toThrow()
  })
})

// ── The guard behind the sweep ──────────────────────────────────────────────────────────────────────────────────
// A key written under another prefix would survive a fresh start unseen. Every `localStorage.setItem(…)` / `sessionStorage.setItem(…)` in src names its key
// as a literal or as a constant defined in the same file; the constant is resolved there. A key defined elsewhere fails, by name, rather than passing unread.

function writtenKeys(src: string): { keys: string[]; unresolved: string[] } {
  const keys: string[] = []
  const unresolved: string[] = []
  for (const m of src.matchAll(/\b(?:localStorage|sessionStorage)\.setItem\(\s*([A-Za-z_$][\w$]*|'[^']*')/g)) {
    const arg = m[1]
    if (arg.startsWith("'")) {
      keys.push(arg.slice(1, -1))
      continue
    }
    const def = src.match(new RegExp(`(?<![\\w$])${arg.replace(/\$/g, '\\$')}\\s*=\\s*'([^']*)'`))
    if (def) keys.push(def[1])
    else unresolved.push(arg)
  }
  return { keys, unresolved }
}

describe('every key the app writes to this device', () => {
  it('canary: the detector reads a literal, a constant of the same file, and names one it cannot resolve', () => {
    const fixture = [
      "localStorage.setItem('foo', '1')",
      "const K = 'horizon-x'",
      'sessionStorage.setItem(K, v)',
      "export const OTHER_K = 'horizon-y'",
      'localStorage.setItem(OTHER_K, v)',
      'localStorage.setItem(ELSEWHERE, v)',
      "localStorage.getItem('not-a-write')",
    ].join('\n')
    expect(writtenKeys(fixture)).toEqual({ keys: ['foo', 'horizon-x', 'horizon-y'], unresolved: ['ELSEWHERE'] })
  })

  it('starts with « horizon- », so the sweep reaches it — and the kept list names only keys that exist', () => {
    const keys: string[] = []
    const unresolved: string[] = []
    for (const file of sourceFiles(srcDir)) {
      const found = writtenKeys(readScanned(file))
      keys.push(...found.keys)
      unresolved.push(...found.unresolved.map((k) => `${relative(srcDir, file)}: ${k}`))
    }
    expect(unresolved, 'define the key next to the write (lib/freshStart.ts sweeps by prefix and this guard resolves constants in the same file only)').toEqual([])
    expect(keys.length, 'the walk found almost nothing: the shape changed').toBeGreaterThanOrEqual(12)
    expect(keys.filter((k) => !k.startsWith('horizon-')), 'a key outside « horizon- » would survive « Repartir à neuf »').toEqual([])
    for (const k of KEPT_ON_FRESH_START) expect(keys, `${k} is kept on a fresh start but nothing writes it any more`).toContain(k)
  })
})

describe('the words', () => {
  it('name the act in both languages, say what is lost and what stays, and the English is not the French', () => {
    const { fr, en } = FRESH_START_COPY
    for (const k of ['title', 'hint', 'button', 'confirm', 'confirmLabel'] as const) {
      expect(fr[k].length, k).toBeGreaterThan(5)
      expect(en[k], k).not.toBe(fr[k])
    }
    expect(fr.confirm).toContain('profil')
    expect(fr.confirm).toMatch(/copie sauvegardée/)
    expect(fr.hint).toMatch(/langue/)
    expect(en.confirm).toMatch(/saved copy/)
    expect(en.hint).toMatch(/language/)
    expect(fr.confirmLabel).toBe(fr.button)
    expect(en.confirmLabel).toBe(en.button)
  })
})

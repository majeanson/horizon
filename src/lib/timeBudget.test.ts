import { afterEach, describe, expect, it, vi } from 'vitest'
import { FR } from '../i18n.ts'
import { EN } from '../i18n.en.ts'
import { TEXT_SCALES } from './accessibility.ts'
import { READING_HELP_COPY } from './readingHelpCopy.ts'
import { TIME_BUDGETS, TIME_BUDGET_KEY, TIME_BUDGET_PATH, getTimeBudget, setTimeBudget } from './timeBudget.ts'
import { TIME_BUDGET_COPY } from './timeBudgetCopy.ts'

// THE FRONT DOOR'S DIALOG (components/WelcomeDialog.tsx): « Combien de temps avez-vous ? » remembered per device, never in the profile, never a crash when
// the storage is refused, each answer a door to its own path — and the words of the front door's reading card.

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.removeItem(TIME_BUDGET_KEY)
})

describe('the time budget', () => {
  it('is nothing on a fresh device, remembers a choice, and is a device preference (not the profile)', () => {
    expect(getTimeBudget()).toBeNull()
    setTimeBudget('2')
    expect(getTimeBudget()).toBe('2')
    setTimeBudget('30')
    expect(getTimeBudget()).toBe('30')
    expect(TIME_BUDGET_KEY).not.toBe('horizon-profile')
  })

  it('any other stored value — the « later » an earlier version kept included — is no budget', () => {
    for (const v of ['5', 'later', '']) {
      localStorage.setItem(TIME_BUDGET_KEY, v)
      expect(getTimeBudget(), v).toBeNull()
    }
  })

  it('a refused storage reads as nothing and does not throw on write', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(getTimeBudget()).toBeNull()
    expect(() => setTimeBudget('15')).not.toThrow()
  })

  it('each budget opens its own path on Profil: the quick questions, the full ones (NAMED, so an earlier « 2 minutes » never overrides them), the documents', () => {
    const [quick, full, docs] = TIME_BUDGETS.map((b) => new URL(TIME_BUDGET_PATH[b], 'https://horizon.test'))
    for (const u of [quick, full, docs]) expect(u.pathname).toBe('/profil')
    expect(quick.searchParams.get('debut')).toBe('rapide')
    expect(full.searchParams.get('debut')).toBe('complet')
    expect(docs.searchParams.get('par')).toBe('document')
    expect(docs.searchParams.get('etape')).toBe('gather')
  })
})

describe('the words', () => {
  it('name each budget in both languages, and the English is not the French', () => {
    const { fr, en } = TIME_BUDGET_COPY
    for (const b of TIME_BUDGETS) {
      expect(fr.options[b].label.length, b).toBeGreaterThan(3)
      expect(fr.options[b].hint.length, b).toBeGreaterThan(20)
      expect(en.options[b].label, b).not.toBe(fr.options[b].label)
      expect(en.options[b].hint, b).not.toBe(fr.options[b].hint)
    }
    for (const k of ['title', 'text'] as const) expect(en[k], k).not.toBe(fr[k])
    expect(en.settings.label).not.toBe(fr.settings.label)
  })

  it('say every text size in both languages, in words rather than percent, and differ between the languages', () => {
    for (const lang of ['fr', 'en'] as const) {
      const c = READING_HELP_COPY[lang]
      for (const s of TEXT_SCALES) {
        expect(c.sizes[s], `${lang}/${s}`).toBeTruthy()
        expect(c.sizes[s]).not.toMatch(/%/)
      }
      expect(new Set(TEXT_SCALES.map((s) => c.sizes[s])).size).toBe(TEXT_SCALES.length)
    }
    // the language row (components/DisplayControls.tsx, shared with the settings page): each language is named in itself, in both editions
    for (const t of [FR, EN]) expect(t.data.display.languages).toEqual({ fr: 'Français', en: 'English' })
    expect(READING_HELP_COPY.fr.title).not.toBe(READING_HELP_COPY.en.title)
  })
})

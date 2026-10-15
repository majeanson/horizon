import { afterEach, describe, expect, it, vi } from 'vitest'
import { TIME_BUDGETS, TIME_BUDGET_KEY, TIME_BUDGET_PATH, getTimeBudget, setTimeBudget, timeBudgetAsked } from './timeBudget.ts'
import { TIME_BUDGET_COPY } from './timeBudgetCopy.ts'
import { WELCOME_COPY } from './welcomeCopy.ts'

// « COMBIEN DE TEMPS AVEZ-VOUS ? »: remembered per device, never in the profile, never a crash when the storage is refused — and each budget opens the
// same door the front door offers.

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.removeItem(TIME_BUDGET_KEY)
})

describe('the time budget', () => {
  it('is unasked on a fresh device, remembers a choice, and « plus tard » counts as asked without a choice', () => {
    expect(timeBudgetAsked()).toBe(false)
    expect(getTimeBudget()).toBeNull()
    setTimeBudget('2')
    expect(timeBudgetAsked()).toBe(true)
    expect(getTimeBudget()).toBe('2')
    setTimeBudget(null)
    expect(timeBudgetAsked()).toBe(true)
    expect(getTimeBudget()).toBeNull()
    expect(TIME_BUDGET_KEY).not.toBe('horizon-profile')
  })

  it('any other stored value is neither a budget nor « asked »', () => {
    localStorage.setItem(TIME_BUDGET_KEY, '5')
    expect(getTimeBudget()).toBeNull()
    expect(timeBudgetAsked()).toBe(false)
  })

  it('a refused storage reads as unasked and does not throw on write', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(timeBudgetAsked()).toBe(false)
    expect(getTimeBudget()).toBeNull()
    expect(() => setTimeBudget('15')).not.toThrow()
  })

  it('inside a frame (the portfolio preview) it counts as asked, whatever the storage says', () => {
    vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window)
    expect(timeBudgetAsked()).toBe(true)
  })

  it('each budget opens the door of the same rank on the front door, in both languages', () => {
    for (const lang of ['fr', 'en'] as const) {
      expect(WELCOME_COPY[lang].doors.map((d) => d.budget)).toEqual([...TIME_BUDGETS])
      for (const d of WELCOME_COPY[lang].doors) expect(TIME_BUDGET_PATH[d.budget], `${lang} ${d.budget}`).toBe(d.to)
    }
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
    for (const k of ['title', 'text', 'later', 'change', 'start', 'otherWays', 'moreAbout'] as const) expect(en[k], k).not.toBe(fr[k])
    expect(fr.yours('2 minutes')).toContain('2 minutes')
    expect(en.yours('Two minutes')).toContain('Two minutes')
    expect(en.settings.label).not.toBe(fr.settings.label)
  })
})

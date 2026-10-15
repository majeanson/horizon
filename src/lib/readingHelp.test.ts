import { afterEach, describe, expect, it, vi } from 'vitest'
import { FR } from '../i18n.ts'
import { EN } from '../i18n.en.ts'
import { TEXT_SCALES } from './accessibility.ts'
import { READING_HELP_KEY, markReadingHelpDone, readingHelpDone } from './readingHelp.ts'
import { READING_HELP_COPY } from './readingHelpCopy.ts'

// THE FRONT DOOR'S READING CARD: remembered per device, never in the profile, and never a crash when the storage is refused.

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.removeItem(READING_HELP_KEY)
})

describe('whether the reading card was put away', () => {
  it('is « not yet » on a fresh device, « done » once marked, and the mark is a device preference (not the profile)', () => {
    expect(readingHelpDone()).toBe(false)
    markReadingHelpDone()
    expect(readingHelpDone()).toBe(true)
    expect(READING_HELP_KEY).not.toBe('horizon-profile')
  })

  it('a refused storage reads as « not yet » on read and does not throw on write', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readingHelpDone()).toBe(false)
    expect(() => markReadingHelpDone()).not.toThrow()
  })

  it('inside a frame (the portfolio preview) it counts as put away, whatever the storage says', () => {
    vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window)
    expect(readingHelpDone()).toBe(true)
    // a frame whose top cannot even be compared is taken as framed too
    vi.spyOn(window, 'top', 'get').mockImplementation(() => {
      throw new Error('cross-origin')
    })
    expect(readingHelpDone()).toBe(true)
  })

  it('any other stored value is not « done »', () => {
    localStorage.setItem(READING_HELP_KEY, 'yes')
    expect(readingHelpDone()).toBe(false)
  })
})

describe('the words', () => {
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
    expect(READING_HELP_COPY.fr.done).not.toBe(READING_HELP_COPY.en.done)
  })
})

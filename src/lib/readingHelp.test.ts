import { afterEach, describe, expect, it, vi } from 'vitest'
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
      expect(c.languages).toEqual({ fr: 'Français', en: 'English' }) // each language is named in itself, in both editions
    }
    expect(READING_HELP_COPY.fr.title).not.toBe(READING_HELP_COPY.en.title)
    expect(READING_HELP_COPY.fr.done).not.toBe(READING_HELP_COPY.en.done)
  })
})

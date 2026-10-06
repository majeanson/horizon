import { afterEach, describe, expect, it } from 'vitest'
import { CONTRAST_KEY, TEXT_SCALE_KEY, TEXT_SCALES, getContrast, getTextScale, setContrast, setTextScale } from './accessibility'
import { THEME_KEY, getTheme, setTheme, toggleTheme } from './theme'

// The three presentation axes a reader varies — theme, contrast, text size — are all
// attribute-on-<html> plus one localStorage key. public/theme-bootstrap.js re-applies them
// before first paint by reading THE SAME KEYS, so a renamed key here would silently stop a
// reload from restoring the reader's choice. These tests pin the contract from both ends.

const root = document.documentElement

afterEach(() => {
  for (const a of ['data-theme', 'data-contrast', 'data-text-scale']) root.removeAttribute(a)
  localStorage.clear()
})

describe('theme', () => {
  it('reads day when nothing is set, night once it is', () => {
    expect(getTheme()).toBe('day')
    setTheme('night')
    expect(getTheme()).toBe('night')
    expect(root.getAttribute('data-theme')).toBe('night')
  })

  it('persists under the key the pre-paint bootstrap reads', () => {
    setTheme('night')
    expect(localStorage.getItem(THEME_KEY)).toBe('night')
    expect(THEME_KEY).toBe('horizon-theme')
  })

  it('toggles and answers the NEW theme', () => {
    expect(toggleTheme()).toBe('night')
    expect(toggleTheme()).toBe('day')
  })

  it('survives blocked storage (a private window must not throw)', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('blocked')
    }
    try {
      expect(() => setTheme('night')).not.toThrow()
      expect(getTheme()).toBe('night')
    } finally {
      Storage.prototype.setItem = original
    }
  })
})

describe('accessibility profile', () => {
  it('high contrast sets the attribute; normal REMOVES it (absence = default)', () => {
    setContrast('high')
    expect(getContrast()).toBe('high')
    expect(root.getAttribute('data-contrast')).toBe('high')
    setContrast('normal')
    expect(getContrast()).toBe('normal')
    expect(root.hasAttribute('data-contrast')).toBe(false)
  })

  it('every text scale round-trips, and normal removes the attribute', () => {
    for (const s of TEXT_SCALES) {
      setTextScale(s)
      expect(getTextScale()).toBe(s)
      expect(root.hasAttribute('data-text-scale')).toBe(s !== 'normal')
    }
  })

  it('an unrecognised attribute reads as normal, never as « not this, therefore that »', () => {
    root.setAttribute('data-text-scale', 'enormous')
    expect(getTextScale()).toBe('normal')
  })

  it('persists under the keys the pre-paint bootstrap reads', () => {
    setContrast('high')
    setTextScale('large')
    expect(localStorage.getItem(CONTRAST_KEY)).toBe('high')
    expect(localStorage.getItem(TEXT_SCALE_KEY)).toBe('large')
    expect([CONTRAST_KEY, TEXT_SCALE_KEY]).toEqual(['horizon-contrast', 'horizon-text-scale'])
  })
})

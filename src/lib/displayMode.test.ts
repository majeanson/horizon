import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { DISPLAY_MODES, MODE_KEY, getMode, setMode } from './displayMode.ts'

// The display mode is a device setting like the theme: a data attribute on <html> (absent = serious), a key in localStorage, applied before first paint by
// public/theme-bootstrap.js. The sheet is the only page that reads it.

afterEach(() => {
  document.documentElement.removeAttribute('data-mode')
  localStorage.clear()
})

describe('the display mode', () => {
  it('is serious until it is changed, and the two modes are the whole set', () => {
    expect(getMode()).toBe('serious')
    expect([...DISPLAY_MODES]).toEqual(['serious', 'adventure'])
  })

  it('sets and removes the attribute, and keeps the choice on the device', () => {
    setMode('adventure')
    expect(document.documentElement.getAttribute('data-mode')).toBe('adventure')
    expect(getMode()).toBe('adventure')
    expect(localStorage.getItem(MODE_KEY)).toBe('adventure')
    setMode('serious')
    // absence means serious: no value is written that no rule defines
    expect(document.documentElement.hasAttribute('data-mode')).toBe(false)
    expect(getMode()).toBe('serious')
    expect(localStorage.getItem(MODE_KEY)).toBe('serious')
  })

  it('reads an unrecognised attribute as serious, never as « not this, therefore that »', () => {
    document.documentElement.setAttribute('data-mode', 'whatever')
    expect(getMode()).toBe('serious')
  })

  it('announces a change, so every control showing it agrees', () => {
    let heard = 0
    const on = () => heard++
    window.addEventListener('horizon-mode-change', on)
    setMode('adventure')
    setMode('serious')
    window.removeEventListener('horizon-mode-change', on)
    expect(heard).toBe(2)
  })

  it('is applied before first paint by the bootstrap, under the very key this module writes', () => {
    const bootstrap = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'theme-bootstrap.js'), 'utf8')
    expect(bootstrap).toContain(`'${MODE_KEY}'`)
    expect(bootstrap).toMatch(/data-mode', 'adventure'/)
    // matched against the one value that means something: a stale key falls back to serious
    expect(bootstrap).toMatch(/getItem\('horizon-mode'\) === 'adventure'/)
  })
})

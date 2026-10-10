import { afterEach, describe, expect, it } from 'vitest'
import { INSTALL_KEY, dismissInstall, installKind, installMemory, promptInstall, uaIsIos } from './install.ts'
import { INSTALL_COPY } from './installCopy.ts'

// THE INSTALL OFFER: which kind of install a device has, what it remembers, and that a prompt is fired once and a « Plus tard » is final.

const noMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList
const fakePrompt = (outcome: 'accepted' | 'dismissed') => {
  const e = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }>; fired: number }
  e.fired = 0
  e.prompt = async () => {
    e.fired++
  }
  e.userChoice = Promise.resolve({ outcome })
  return e
}

afterEach(() => {
  window.horizonInstall = undefined
  localStorage.clear()
  delete (navigator as { standalone?: boolean }).standalone
  // @ts-expect-error — back to happy-dom's own
  delete window.matchMedia
})

describe('which kind of install this device has', () => {
  it('recognises an iPhone, an iPad and an iPad that says it is a Mac, and nothing else', () => {
    expect(uaIsIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe(true)
    expect(uaIsIos('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', 5)).toBe(true)
    expect(uaIsIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true) // iPadOS in desktop mode
    expect(uaIsIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false) // a real Mac
    expect(uaIsIos('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 5)).toBe(false)
    expect(uaIsIos('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0)).toBe(false)
  })

  it('is « native » when the browser parked a prompt, « installed » in an app window, and « manual » otherwise', () => {
    window.matchMedia = noMedia
    expect(installKind()).toBe('manual')
    window.horizonInstall = fakePrompt('accepted') as never
    expect(installKind()).toBe('native')
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true })
    expect(installKind(), 'an app already installed needs no offer, prompt or not').toBe('installed')
  })
})

describe('what the device remembers', () => {
  it('a « Plus tard » is final: remembered, and the answer to « did they decide » stays', () => {
    expect(installMemory()).toBeNull()
    dismissInstall()
    expect(installMemory()).toBe('later')
    expect(localStorage.getItem(INSTALL_KEY)).toBe('later')
  })

  it('reads nothing but the two values it writes', () => {
    localStorage.setItem(INSTALL_KEY, 'whatever')
    expect(installMemory()).toBeNull()
  })
})

describe('firing the browser’s prompt', () => {
  it('fires it once, remembers an accepted install, and has nothing to fire the second time', async () => {
    window.matchMedia = noMedia
    const e = fakePrompt('accepted')
    window.horizonInstall = e as never
    expect(await promptInstall()).toBe('accepted')
    expect(e.fired).toBe(1)
    expect(installMemory()).toBe('done')
    expect(window.horizonInstall).toBeUndefined()
    expect(await promptInstall()).toBe('unavailable')
    expect(e.fired).toBe(1)
  })

  it('a refused dialog is not an install: nothing is remembered, so the offer stays on the settings page', async () => {
    window.matchMedia = noMedia
    window.horizonInstall = fakePrompt('dismissed') as never
    expect(await promptInstall()).toBe('dismissed')
    expect(installMemory()).toBeNull()
  })

  it('has nothing to say when the browser never offered one', async () => {
    expect(await promptInstall()).toBe('unavailable')
  })
})

describe('the install words, in both languages', () => {
  it('have the same keys, nothing empty, and English that is not French pasted in', () => {
    const flat = (w: object): [string, string][] => Object.entries(w).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v] as [string, string]] : flat(v).map(([kk, vv]): [string, string] => [`${k}.${kk}`, vv])))
    const fr = flat(INSTALL_COPY.fr)
    const en = flat(INSTALL_COPY.en)
    expect(en.map(([k]) => k)).toEqual(fr.map(([k]) => k))
    for (const [k, v] of [...fr, ...en]) expect(v.trim().length, k).toBeGreaterThan(0)
    const frMap = new Map(fr)
    for (const [k, v] of en) if (v.length > 30) expect(v, k).not.toBe(frMap.get(k))
  })

  it('say what installing is, and that nothing leaves the device', () => {
    expect(INSTALL_COPY.fr.card.text).toMatch(/sans réseau/)
    expect(INSTALL_COPY.en.card.text).toMatch(/without a network/)
    expect(INSTALL_COPY.fr.line.hint).toMatch(/Rien n’est envoyé nulle part/)
    expect(INSTALL_COPY.en.line.hint).toMatch(/Nothing is sent anywhere/)
  })
})

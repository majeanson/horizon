import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { isStandalone } from './standalone.ts'

// THE APP AS AN INSTALLED APP: the two manifests (French by default, English for an English reader) say the same things in two languages; the home-screen
// shortcuts lead to real pages; the bootstrap and lib/standalone.ts read « installed » the same way; and the CSS that dresses the installed app is keyed on
// the attribute the bootstrap stamps, never on a script.

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')
const manifest = (name: string) => JSON.parse(read(`public/${name}`)) as Record<string, any>
const fr = manifest('manifest.webmanifest')
const en = manifest('manifest.en.webmanifest')

describe('the install manifests', () => {
  it('say the same thing in two languages: same shape, same URLs, same icons, different words', () => {
    for (const key of ['id', 'start_url', 'scope', 'display', 'display_override', 'launch_handler', 'orientation', 'background_color', 'theme_color', 'icons', 'categories']) {
      expect(en[key], key).toEqual(fr[key])
    }
    expect(fr.lang).toBe('fr')
    expect(en.lang).toBe('en')
    expect(en.name).not.toBe(fr.name)
    expect(en.description).not.toBe(fr.description)
  })

  it('open in their own window, fall back to a minimal one, and reuse the window that is already open', () => {
    expect(fr.display).toBe('standalone')
    expect(fr.display_override).toEqual(['standalone', 'minimal-ui'])
    expect(fr.launch_handler).toEqual({ client_mode: 'navigate-existing' })
    expect(fr.scope).toBe('/')
    expect(fr.id).toBe('/')
  })

  it('point at icons that exist, one of them maskable', () => {
    for (const icon of fr.icons as { src: string; purpose?: string }[]) expect(existsSync(join(root, 'public', icon.src)), icon.src).toBe(true)
    expect((fr.icons as { purpose?: string }[]).some((i) => i.purpose === 'maskable')).toBe(true)
  })
})

describe('the home-screen shortcuts', () => {
  const routes = [...read('src/router.tsx').matchAll(/<Route path="([a-z-]+)"/g)].map((m) => `/${m[1]}`)

  it('are the same three pages in both languages, each with a name, a short name and an icon', () => {
    expect(fr.shortcuts.map((s: { url: string }) => s.url)).toEqual(['/resultats', '/profil', '/fiche'])
    expect(en.shortcuts.map((s: { url: string }) => s.url)).toEqual(fr.shortcuts.map((s: { url: string }) => s.url))
    for (const manifestOf of [fr, en]) {
      for (const s of manifestOf.shortcuts as { name: string; short_name: string; icons: { src: string }[] }[]) {
        expect(s.name.length).toBeGreaterThan(0)
        expect(s.short_name.length).toBeGreaterThan(0)
        expect(s.short_name.length, 'a short name is short').toBeLessThanOrEqual(12)
        expect(s.icons.length).toBeGreaterThan(0)
      }
    }
    for (let i = 0; i < fr.shortcuts.length; i++) expect(en.shortcuts[i].name).not.toBe(fr.shortcuts[i].name)
  })

  it('lead to pages the router has, inside the manifest scope', () => {
    expect(routes.length).toBeGreaterThan(4)
    for (const s of fr.shortcuts as { url: string }[]) {
      expect(routes, s.url).toContain(s.url)
      expect(s.url.startsWith(fr.scope)).toBe(true)
    }
  })

  it('a shortcut to a page that does not exist would be caught (the canary)', () => {
    expect(routes).not.toContain('/nope')
  })
})

describe('installed or in a tab', () => {
  afterEach(() => {
    delete (navigator as { standalone?: boolean }).standalone
    // @ts-expect-error — restore happy-dom's own matchMedia
    delete window.matchMedia
  })
  const media = (installedMode: string | null) => (query: string) => ({ matches: installedMode !== null && query.includes(`(display-mode: ${installedMode})`), addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList

  it('is installed in any of the three display modes that mean it, and only then', () => {
    for (const mode of ['standalone', 'fullscreen', 'minimal-ui']) {
      window.matchMedia = media(mode)
      expect(isStandalone(), mode).toBe(true)
    }
    window.matchMedia = media('browser')
    expect(isStandalone(), 'a tab').toBe(false)
    window.matchMedia = media(null)
    expect(isStandalone(), 'a browser that does not know the media feature is a tab, not an app').toBe(false)
  })

  it('is installed on iOS when navigator.standalone says so', () => {
    window.matchMedia = media(null)
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true })
    expect(isStandalone()).toBe(true)
  })

  it('is read the same way by the bootstrap, which stamps data-standalone before first paint', () => {
    const bootstrap = read('public/theme-bootstrap.js')
    expect(bootstrap).toMatch(/\['standalone', 'fullscreen', 'minimal-ui'\]/)
    expect(bootstrap).toMatch(/navigator\.standalone === true/)
    expect(bootstrap).toMatch(/setAttribute\('data-standalone', ''\)/)
  })

  it('dresses the installed app from the attribute, and never changes what a tab looks like', () => {
    const css = read('src/styles/phone.css')
    // the chrome of an installed app does not select; the content and the fields still do
    expect(css).toMatch(/\[data-standalone\] \.shell__bar[\s\S]*?user-select: none/)
    expect(css).not.toMatch(/\[data-standalone\][^{]*\.page-body/)
    expect(css).not.toMatch(/\[data-standalone\][^{]*(input|textarea)/)
    // zoom is never blocked: touch-action says manipulation, which keeps pinch
    expect(css).toMatch(/touch-action: manipulation/)
    expect(css).not.toMatch(/touch-action:\s*none/)
    expect(read('index.html')).not.toMatch(/user-scalable=no|maximum-scale/)
  })
})

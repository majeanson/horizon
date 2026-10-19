import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PIP_ICONS } from './pipIcons.ts'

// THE BRAND'S MARK is drawn in four places that cannot import one another: the icon registry (components/BrandMark.tsx reads it), the favicon, the
// shell painted before the app runs (index.html) and the script that renders the home-screen icons. Each holds the SAME path, or the tab, the
// first paint and the installed app would show three different suns.

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (f: string) => readFileSync(join(root, f), 'utf8')
const pathsIn = (src: string) => [...src.matchAll(/\bd="([^"]+)"/g)].map((m) => m[1])

const registry = PIP_ICONS['sun-horizon-bold'].match(/d="([^"]+)"/)![1]

describe('the brand mark', () => {
  it('canary: the reader finds a path, and a changed digit is a different path', () => {
    expect(pathsIn('<svg><path d="M1,2Z"/></svg>')).toEqual(['M1,2Z'])
    expect(registry.replace('22.77', '22.78')).not.toBe(registry)
  })

  it('is one drawing in the favicon, the first paint and the icon script', () => {
    expect(pathsIn(read('public/favicon.svg'))).toEqual([registry])
    expect(pathsIn(read('index.html'))).toContain(registry)
    expect(read('scripts/make-icons.mjs').match(/const SUN =\s*'([^']+)'/)?.[1]).toBe(registry)
  })

  it('is the tab icon, with the PNG kept for the browsers that read no SVG', () => {
    const html = read('index.html')
    expect(html).toMatch(/<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/)
    expect(html).toMatch(/<link rel="icon" type="image\/png" href="\/icons\/icon-192\.png"/)
    // …and an installed app opened offline still has it: the service worker precaches it with the shell.
    const vite = read('vite.config.ts')
    const shell = vite.slice(vite.indexOf('const PUBLIC_SHELL'), vite.indexOf(']', vite.indexOf('const PUBLIC_SHELL')))
    expect(shell).toContain(`'/favicon.svg'`)
  })
})

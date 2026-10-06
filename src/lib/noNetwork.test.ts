import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { blankComments, sourceFiles } from './buildGuardScan'

// LOCAL FOREVER, as a build gate.
//
// Horizon's promise is that a household's financial profile — income history, balances,
// pension values — never leaves the device. That promise is only worth something if it cannot
// be broken by accident, so the code that could break it is forbidden outright: there is no
// `fetch`, no XMLHttpRequest, no WebSocket, no EventSource, no `sendBeacon` anywhere in the
// app's own source, and the Worker has no /api (worker/index.ts only serves static assets).
// The CSP (`connect-src 'self'`, worker/securityHeaders.ts) is the second lock on the same
// door; this test is the first.
//
// What is NOT matched, on purpose: the service worker REGISTRATION (`navigator.serviceWorker`
// .register) and `reg.update()` — they talk to our own origin's /sw.js, and offline-first is
// the product. The generated sw.js itself uses `fetch` to fill its own cache; it is a build
// output (vite.config.ts), not source, and it fetches same-origin URLs only.
//
// ALLOWED is empty and should stay empty: a legitimate network need is a product decision, so
// it belongs in a conversation and in CLAUDE.md, not in a quiet entry here.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const rootDir = join(srcDir, '..')

const ALLOWED = new Map<string, string>([])

// The network surface of the browser, as code a person could write.
const BANNED: ReadonlyArray<readonly [name: string, re: RegExp]> = [
  ['fetch(', /(?<![.\w])fetch\s*\(/g],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/g],
  ['WebSocket', /\bWebSocket\b/g],
  ['EventSource', /\bEventSource\b/g],
  ['sendBeacon', /\bsendBeacon\b/g],
  ['navigator.connection', /\bnavigator\.connection\b/g],
]

interface Site {
  file: string
  line: number
  what: string
}

function scanText(file: string, text: string): Site[] {
  const out: Site[] = []
  for (const [what, re] of BANNED) {
    for (const m of text.matchAll(re)) out.push({ file, line: text.slice(0, m.index).split('\n').length, what })
  }
  return out
}

function networkSites(): Site[] {
  const out: Site[] = []
  for (const f of sourceFiles(srcDir)) {
    out.push(...scanText(relative(rootDir, f).split(sep).join('/'), blankComments(readFileSync(f, 'utf8'))))
  }
  // The one hand-written script that runs in the page outside the bundle.
  for (const name of readdirSync(join(rootDir, 'public')).filter((n) => n.endsWith('.js'))) {
    out.push(...scanText(`public/${name}`, blankComments(readFileSync(join(rootDir, 'public', name), 'utf8'))))
  }
  return out
}

describe('local forever (no network code in the app)', () => {
  // The canary: the detector pinned against a fixture with every shape, and the look-alikes
  // it must leave alone.
  it('the detector sees every network shape and none of its look-alikes', () => {
    const fixture = [
      `await fetch('/api/x')`, // 1
      `new XMLHttpRequest()`, // 2
      `new WebSocket(u)`, // 3
      `new EventSource(u)`, // 4
      `navigator.sendBeacon(u, d)`, // 5
      `const refetch = 1`, // not fetch(
      `obj.fetch(x)`, // a method named fetch is someone else's — and still caught by review
      `navigator.serviceWorker.register('/sw.js')`, // our own origin: allowed
      `reg.update()`,
    ].join('\n')
    const hits = scanText('fixture', fixture)
    expect(hits.map((h) => h.line).sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('scans the whole tree (a floor, so an empty walk cannot pass)', () => {
    expect(sourceFiles(srcDir).length).toBeGreaterThan(10)
  })

  it('no fetch / XHR / WebSocket / EventSource / sendBeacon anywhere in src/ or public/', () => {
    const offenders = networkSites()
      .filter((s) => !ALLOWED.has(s.file))
      .map((s) => `${s.file}:${s.line} ${s.what}`)
    expect(
      offenders,
      'Horizon keeps the profile on the device and sends nothing anywhere. A network need is a PRODUCT decision: raise it, change CLAUDE.md and the CSP together — do not add an ALLOWED entry.',
    ).toEqual([])
  })

  it('every ALLOWED file still has network code (a stale entry reads as permission)', () => {
    const live = new Set(networkSites().map((s) => s.file))
    expect([...ALLOWED.keys()].filter((f) => !live.has(f))).toEqual([])
  })

  it('the CSP keeps the second lock: connect-src stays \'self\'', () => {
    const csp = readFileSync(join(rootDir, 'worker', 'securityHeaders.ts'), 'utf8')
    expect(csp).toContain(`"connect-src 'self'"`)
  })
})

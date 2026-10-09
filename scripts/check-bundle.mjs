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
  { re: /^index-/, cap: 46 * KB, label: 'eager entry' }, // 44 → 46 KB on 2026-10-09 (measured 45,5 KB): schema v16 — the saved profile now validates and migrates the children inside the household, the dated flows, the work kept after retirement and the spending drift; code the store reads at start, so it rides in the shell. 42 → 44 KB on 2026-10-08 (measured 43,3 KB): the shell's backup notice exports in one tap (the file helper and the store's snooze ride in the shell), the settings gear, and a skeleton as the route fallback. 40 → 42 KB on 2026-10-08 (measured 40,6 KB): the saved profile now validates and migrates named plans (each a whole profile) and the market path, and profileEdit carries their edits — code every page's store reads, so it rides in the shell
  { re: /^react-vendor-/, cap: 280 * KB, label: 'eager react-vendor' },
  { re: /^i18n-/, cap: 36 * KB, label: 'eager i18n (FR only — EN lazy-loads as its own chunk)' }, // 34 → 36 (2026-10-08, measured 34,6 KB): each person's horizon age, the survivor's spending share, a pension's survivor share and their two ⓘ notes. 33 → 34: the locked-in REER (the chip, two fields, one ⓘ: ~1 KB of French; the REER balance's note shortened to pay for part of it). 36 → 33: the results-only copy (the three questions, the headline, « each of us ») moved to lib/resultsCopy.ts, fetched with the results page; it was 31.2 KB measured after the move. 33 → 36: Simple/Full, the headline, the next steps and the three questions (~3 KB of French). 30 → 33: the couple's per-person verdict, the pension start month and the deferred-rule offer (~2 KB of French); splitting the results copy into its own lazy chunk is the next step if this grows
]
// Chunks that are lazy AND deliberately un-precached (see ONLINE_ONLY_CHUNKS in vite.config.ts).
const ONLINE_ONLY = [{ re: /^DevKit-/, cap: 60 * KB }]
// Chunks that DO need precaching but are too big for the generic per-chunk budget.
// MEASURED from the real build (2026-10-06): the chart library is 347 KB raw / 103 KB gzip — Recharts 3 with d3 and its
// state store. It is lazy, precached once, and never on the first screen (NOT_IN_DOOR below). The cap sits just above
// today's size, so a dependency bump that grows it fails here; it comes DOWN after any win, never back up. (If the
// library is ever swapped, that is a one-folder change: components/charts/, chartBoundary.test.ts.)
// 347 → 369 KB raw (108 KB gzip) on 2026-10-06: the stacked bar chart of « Mes années 60 à 70 » brings the library's
// bar and composed-chart parts into the same lazy chunk.
// The results page: 150 → 156 KB raw on 2026-10-08 (measured 151,7 KB). It now carries the « Détail » chart (sources, accounts, the three
// hypotheses), one table per choice (TableChooser), the home and locked-in REER columns, the confidence note and the mortgage-aware
// tables — most of it text the person reads, not a library. The cap sits just above today's size, so growth fails here.
// 156 → 160 KB raw on 2026-10-08 (measured 156,4 KB): the answer in dates on the card, the « Autre âge » box, the levers block and
// the per-card scenario marks that replaced the strategies' matrix table.
// 160 → 166 KB raw on 2026-10-08 (measured 164,2 KB): the engine's surviving spouse's pension (survivor.ts), the Allowance for
// the Survivor and the names of their fourteen figures ride in the results closure with the rest of the engine.
const LAZY_CAPS = [
  { re: /^charts-[^.]*\.js$/, cap: 372 * KB },
  { re: /^Resultats-[^.]*\.js$/, cap: 166 * KB },
]

// The door.
const CLOSURE_CHUNK_CAP = 6
const CLOSURE_BUDGET = 336 * KB // 334 → 336 on 2026-10-09: the entry's own 2 KB (see its cap). 330 → 334 on 2026-10-08: the entry's own 2 KB (see its cap)
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

import { citedLeaves } from '../src/engine/params/cited.ts'
import { KNOWN, SERIES } from '../src/engine/params/index.ts'

// `npm run sources:check` — do the pages this repo cites still exist, and how old are the readings?
//
// The engine is only as good as the pages behind its figures, and a government site reorganises
// without warning. This asks every cited URL for itself and reports:
//   ok       — the page answered (2xx, after redirects)
//   blocked  — the agency refuses automated requests (403 / 429 / a captcha): the page may be
//              perfectly alive, a person can open it, and the check can say nothing either way
//   GONE     — 404 / 410: the page moved or was withdrawn → the figure needs re-reading
//   ERROR    — DNS, TLS or a server error → try again, then investigate
// …and which readings are older than 400 days (a year's figures go stale on 1 January).
//
// It exits non-zero on GONE or ERROR only. `blocked` is reported, never fatal: Revenu Québec and the
// RAMQ block every non-browser client, which is a fact about them, not about the figure.
// Network, so never part of `npm test`; .github/workflows/sources.yml runs it weekly.

const STALE_DAYS = 400
const UA = 'Mozilla/5.0 (compatible; horizon-source-check; +https://github.com/majeanson/horizon)'

interface Use {
  path: string
  retrieved: string
}
const urls = new Map<string, { title: string; uses: Use[] }>()
const leaves = [
  ...Object.entries(KNOWN).flatMap(([year, tree]) => citedLeaves(tree).map((l) => ({ path: `${year}.${l.path}`, cited: l.cited }))),
  ...SERIES.map((s) => ({ path: s.name, cited: s.cited })),
]
for (const { path, cited } of leaves) {
  const e = urls.get(cited.source.url) ?? { title: cited.source.title, uses: [] }
  e.uses.push({ path, retrieved: cited.source.retrieved })
  urls.set(cited.source.url, e)
}

type Verdict = 'ok' | 'blocked' | 'GONE' | 'ERROR'
async function check(url: string): Promise<{ verdict: Verdict; detail: string }> {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,application/pdf,*/*' }, signal: AbortSignal.timeout(30_000) })
    await res.body?.cancel()
    if (res.ok) return { verdict: 'ok', detail: String(res.status) }
    if (res.status === 403 || res.status === 429) return { verdict: 'blocked', detail: String(res.status) }
    if (res.status === 404 || res.status === 410) return { verdict: 'GONE', detail: String(res.status) }
    return { verdict: 'ERROR', detail: String(res.status) }
  } catch (e) {
    return { verdict: 'ERROR', detail: e instanceof Error ? e.message : String(e) }
  }
}

const now = Date.now()
const results: { url: string; title: string; verdict: Verdict; detail: string; uses: Use[] }[] = []
// Politely, two at a time: these are government servers.
const queue = [...urls.entries()]
await Promise.all(
  [0, 1].map(async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const [url, info] = next
      results.push({ url, title: info.title, ...(await check(url)), uses: info.uses })
    }
  }),
)

results.sort((a, b) => a.url.localeCompare(b.url))
for (const r of results) {
  console.log(`${r.verdict.padEnd(7)} ${r.detail.padEnd(4)} ${r.uses.length.toString().padStart(3)} figure(s)  ${r.url}`)
}

const stale = leaves.filter(({ cited }) => (now - Date.parse(cited.source.retrieved)) / 86_400_000 > STALE_DAYS)
const bad = results.filter((r) => r.verdict === 'GONE' || r.verdict === 'ERROR')
const blocked = results.filter((r) => r.verdict === 'blocked')

console.log(`\n${results.length} pages: ${results.filter((r) => r.verdict === 'ok').length} ok, ${blocked.length} blocked to automated clients, ${bad.length} gone or in error.`)
if (blocked.length) console.log('Blocked (open them in a browser to check): ' + blocked.map((r) => r.url).join('\n  '))
if (stale.length) console.log(`\n⚠ ${stale.length} figure(s) were read more than ${STALE_DAYS} days ago — a new tax year has probably been published; re-read them.`)
if (bad.length) {
  console.error('\n✗ these pages are gone or erroring — the figures they back need re-reading:')
  for (const r of bad) console.error(`  ${r.verdict} ${r.detail} ${r.url}\n    used by: ${r.uses.map((u) => u.path).slice(0, 6).join(', ')}`)
  process.exit(1)
}

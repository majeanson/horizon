import { writeFileSync } from 'node:fs'
import { compare, nextQuarterUrl, pageText, watched, WATCH_YEAR } from './figureWatch.ts'

// `npm run figures:check` — has a number moved on the page that backs it? (docs/figure-diff-job.md is the design.)
//
// `sources:check` asks whether each cited page still EXISTS. This reads the few figures that move on a schedule — the CCB each July, the OAS each quarter, the CHSLD rates each January — off
// the cited page and compares them with the params. It only reports; moving a figure is a human decision. Verdicts:
//   same       — the page prints what the params hold
//   CHANGED    — the page prints another number: re-read the page, then params/<year>.ts, its literal test, `npm run sources`, the golden snapshots
//   unchecked  — the page could not be fetched or the sentence the extractor reads is gone: said, never counted as « same »
// …and one probe: the OAS quarterly page after the cited one, whose appearance means the OAS / GIS figures moved.
//
// Exit 1 on CHANGED or a newer quarter (and, with `--report <file>`, a Markdown digest is written for the workflow to open an issue with). `unchecked` is printed, never fatal: an extractor that goes
// quiet is listed so a person looks, but a government site having a bad day must not open an issue. Network, so never part of `npm test`; .github/workflows/figures.yml runs it weekly.

const UA = 'Mozilla/5.0 (compatible; horizon-figure-check; +https://github.com/majeanson/horizon)'
const reportAt = process.argv.includes('--report') ? process.argv[process.argv.indexOf('--report') + 1] : null

async function get(url: string): Promise<{ status: number; text: string }> {
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,*/*' }, signal: AbortSignal.timeout(30_000) })
  return { status: res.status, text: res.ok ? pageText(await res.text()) : '' }
}

interface Line {
  path: string
  url: string
  held: number
  printed: number | null
  verdict: 'same' | 'CHANGED' | 'unchecked'
  why?: string
}

const lines: Line[] = []
const pages = new Map<string, Promise<{ status: number; text: string } | Error>>()
for (const w of watched()) {
  if (!pages.has(w.url)) pages.set(w.url, get(w.url).catch((e: unknown) => (e instanceof Error ? e : new Error(String(e)))))
  const page = await pages.get(w.url)!
  if (page instanceof Error) {
    lines.push({ path: w.path, url: w.url, held: w.held, printed: null, verdict: 'unchecked', why: page.message })
    continue
  }
  if (page.status !== 200) {
    lines.push({ path: w.path, url: w.url, held: w.held, printed: null, verdict: 'unchecked', why: `HTTP ${page.status}` })
    continue
  }
  const printed = w.extract(page.text)
  lines.push({ path: w.path, url: w.url, held: w.held, printed, verdict: compare(w.held, printed), why: printed === null ? 'the sentence the extractor reads is not on the page any more' : undefined })
}

// The OAS probe: the quarter after the cited one.
const oasUrl = watched().find((w) => w.path === 'oas.monthly65to74')!.url
const next = nextQuarterUrl(oasUrl)
let newerQuarter: string | null = null
if (next !== null) {
  try {
    const res = await fetch(next, { redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) })
    await res.body?.cancel()
    if (res.status === 200) newerQuarter = next
  } catch {
    // a probe that cannot be made says nothing; the weekly run tries again
  }
}

for (const l of lines) console.log(`${l.verdict.padEnd(9)} ${l.path.padEnd(36)} held ${String(l.held).padStart(9)}  page ${l.printed === null ? '—' : String(l.printed).padStart(9)}${l.why ? `  (${l.why})` : ''}`)
console.log(newerQuarter ? `\nNEWER OAS QUARTER PUBLISHED: ${newerQuarter}` : '\nno newer OAS quarter yet')

const changed = lines.filter((l) => l.verdict === 'CHANGED')
const unchecked = lines.filter((l) => l.verdict === 'unchecked')
console.log(`\n${lines.length} figures: ${lines.filter((l) => l.verdict === 'same').length} same, ${changed.length} changed, ${unchecked.length} unchecked.`)

if (reportAt !== null && (changed.length > 0 || newerQuarter !== null)) {
  const body = [
    `The weekly figure check (\`npm run figures:check\`, ${new Date().toISOString().slice(0, 10)}) found ${changed.length > 0 ? 'figures that moved' : 'a new quarter'} on the pages that cite them for ${WATCH_YEAR}.`,
    '',
    ...changed.map((l) => `- **${l.path}** — params hold ${l.held}, the page prints ${l.printed} (${l.url})`),
    ...(newerQuarter ? [`- **OAS / GIS** — the next quarterly page is up: ${newerQuarter}`] : []),
    ...(unchecked.length > 0 ? ['', `Not checked this week: ${unchecked.map((l) => l.path).join(', ')}.`] : []),
    '',
    'To settle it: read the page, then `src/engine/params/<year>.ts` (value, `retrieved`, note), its literal test, `npm run sources`, and the golden snapshots (`npm run examples`). The job never edits the repository.',
  ].join('\n')
  writeFileSync(reportAt, body + '\n')
}
if (changed.length > 0 || newerQuarter !== null) process.exit(1)

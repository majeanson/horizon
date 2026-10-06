import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// ─────────────────────────────────────────────────────────────────────────────
// /dev/kit ↔ code parity, both directions.
//
// The standing rule (CLAUDE.md): "a new primitive that isn't in the gallery is invisible to the
// next session and will get re-invented." In the project this was scaffolded from, nothing
// enforced it, and an audit found the rule had quietly stopped being true — 140 rows in the
// inventory, 91 specimens, and NO WAY TO TELL an oversight from a deliberate exemption, so both
// accumulated silently.
//
// The fix is a convention this file enforces: a row of COMPONENTS.md's primitive table either
// has a live specimen in src/pages/DevKit.tsx, or ends with `*(no specimen: <reason>)*`. Both
// halves fail closed. It also pins the two shapes that made that audit lie before it was
// believed: a component NAME declared in two files, and a gallery entry whose `name` promises a
// component its `file` does not export.
//
// House rule: PLANT THE BUG, WATCH IT GO RED, then trust it.
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '../..')
const DEVKIT = path.join(ROOT, 'src/pages/DevKit.tsx')
const MD = path.join(ROOT, 'COMPONENTS.md')

const devkit = fs.readFileSync(DEVKIT, 'utf8')
const md = fs.readFileSync(MD, 'utf8')
const mdLines = md.split(/\r?\n/)

// ── the gallery ──────────────────────────────────────────────────────────────
interface Entry {
  cat: string
  name: string
  file: string
  exports: string[]
}

// Anchored on the three fields in their real order, whitespace-tolerant (an entry may sit on
// one line or span several). A looser parse (matching the `Entry[]` brackets, or a bare
// /cat: '…'/) counts a local `cat` variable inside a render as if it were an entry.
const ENTRIES: Entry[] = [
  ...devkit.matchAll(/cat: '([^']+)',\s*name: '([^']+)',\s*file: '([^']+)',(?:\s*exports: \[([^\]]*)\],)?/g),
].map((m) => ({
  cat: m[1],
  name: m[2],
  file: m[3],
  exports: m[4] ? [...m[4].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [],
}))

// ── COMPONENTS.md's primitive table ──────────────────────────────────────────
interface Row {
  line: number
  name: string
  files: string[]
  excused: boolean
}

const pathsIn = (s: string) => [...s.matchAll(/(?:src\/)[A-Za-z0-9_/.-]+\.(?:tsx?|css)/g)].map((m) => m[0])

const secStart = mdLines.findIndex((l) => l.startsWith('## Shared primitives'))
const secEnd = mdLines.findIndex((l) => l.startsWith('## Page orchestrators'))
const ROWS: Row[] = []
for (let i = secStart; i >= 0 && i < secEnd; i++) {
  const l = mdLines[i]
  if (!l.startsWith('|')) continue
  const cells = l.split('|').map((c) => c.trim())
  if (cells.length < 4) continue
  const name = cells[1].replace(/\*\*/g, '').trim()
  if (!name || /^-+$/.test(name) || name === 'Component') continue
  const files = pathsIn(cells[2])
  if (!files.length) continue
  ROWS.push({ line: i + 1, name, files, excused: /\*\(no specimen: .+?\)\*/.test(l) })
}

describe('/dev/kit ↔ COMPONENTS.md parity', () => {
  it('parses both sides (canary — a parser that finds nothing proves nothing)', () => {
    // Both numbers only ever move deliberately. They exist so that a regex that silently stops
    // matching fails HERE, loudly, instead of turning every rule below into a green no-op.
    expect(secStart, 'COMPONENTS.md lost its "## Shared primitives" heading').toBeGreaterThan(-1)
    expect(secEnd, 'COMPONENTS.md lost its "## Page orchestrators" heading').toBeGreaterThan(secStart)
    expect(ENTRIES.length).toBeGreaterThanOrEqual(12)
    expect(ROWS.length).toBeGreaterThanOrEqual(12)
  })

  it('every primitive row has a specimen, or says why not', () => {
    const kitFiles = new Set(ENTRIES.map((e) => e.file))
    const offenders = ROWS.filter((r) => !r.excused && !r.files.some((f) => kitFiles.has(f))).map(
      (r) => `COMPONENTS.md:${r.line} ${r.name} (${r.files.join(', ')})`,
    )
    expect(
      offenders,
      'Each of these is listed as a shared primitive but has no live specimen in /dev/kit.\n' +
        'Add an Entry to src/pages/DevKit.tsx, or end the row with *(no specimen: <reason>)*.',
    ).toEqual([])
  })

  it('every gallery specimen has a row in COMPONENTS.md (the other direction)', () => {
    const rowFiles = new Set(ROWS.flatMap((r) => r.files))
    const orphans = ENTRIES.filter((e) => !rowFiles.has(e.file)).map((e) => `${e.name} → ${e.file}`)
    expect(orphans, 'A specimen exists for a component the inventory does not list — add its row.').toEqual([])
  })

  it('every gallery entry points at a file that exists', () => {
    const missing = ENTRIES.filter((e) => !fs.existsSync(path.join(ROOT, e.file))).map((e) => `${e.name} → ${e.file}`)
    expect(missing, 'A gallery entry cites a file that is not there — a rename left the gallery lying.').toEqual([])
  })

  it('every gallery entry name (and listed export) is exported by its file', () => {
    const bad: string[] = []
    for (const e of ENTRIES) {
      const exported = new Set(exportsOf(path.join(ROOT, e.file)))
      for (const token of [e.name, ...e.exports])
        if (/^[A-Za-z][A-Za-z0-9]*$/.test(token) && !exported.has(token))
          bad.push(`${e.name} → "${token}" is not exported by ${e.file}`)
    }
    expect(bad, 'A gallery entry promises a component its own file does not export.').toEqual([])
  })

  it('no component name is declared in two files', () => {
    // A name declared twice is a fork waiting to drift — the import line is the only tell.
    const home = new Map<string, string[]>()
    for (const f of walk(path.join(ROOT, 'src/components'))) {
      if (f.endsWith('.test.ts') || f.endsWith('.test.tsx')) continue
      const src = fs.readFileSync(f, 'utf8')
      for (const m of src.matchAll(/^export function ([A-Z][A-Za-z0-9]*)\(/gm)) {
        const rel = path.relative(ROOT, f).split(path.sep).join('/')
        home.set(m[1], [...(home.get(m[1]) ?? []), rel])
      }
    }
    const dupes = [...home.entries()].filter(([, files]) => files.length > 1).map(([n, f]) => `${n}: ${f.join(' + ')}`)
    expect(dupes, 'Two components share a name. One of them is a fork waiting to drift.').toEqual([])
  })

  it('every gallery category is declared in COMPONENTS.md, and none that the gallery retired', () => {
    // COMPONENTS.md groups by role and the gallery by category; the mapping is written down so a
    // category that appears in the gallery without joining it fails here.
    const head = mdLines.findIndex((l) => l.startsWith("| This file's section |"))
    expect(head, 'the category mapping table is gone from COMPONENTS.md').toBeGreaterThan(-1)
    // Start past the header + separator rows: the header cell itself says `/dev/kit`, which a
    // backtick scan would read as a category.
    const rows: string[] = []
    for (let i = head + 2; i < mdLines.length && mdLines[i].startsWith('|'); i++) rows.push(mdLines[i])
    const declared = new Set(rows.flatMap((l) => [...l.matchAll(/`([^`]+)`/g)].map((m) => m[1])))
    const live = new Set(ENTRIES.map((e) => e.cat))
    expect([...live].filter((c) => !declared.has(c)), 'A gallery category is not in the mapping table.').toEqual([])
    expect([...declared].filter((c) => !live.has(c)), 'The mapping table names a category the gallery no longer uses.').toEqual([])
  })

  it('the gallery has one name per category', () => {
    // One word per idea, inside the gallery too.
    const cats = [...new Set(ENTRIES.map((e) => e.cat))]
    const collisions: string[] = []
    for (const a of cats)
      for (const b of cats) if (a !== b && norm(b).includes(norm(a))) collisions.push(`"${a}" is contained in "${b}"`)
    expect(collisions, 'Two gallery categories name the same idea.').toEqual([])
  })
})

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

function exportsOf(file: string): string[] {
  if (!fs.existsSync(file)) return []
  const src = fs.readFileSync(file, 'utf8')
  const names: string[] = []
  for (const m of src.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class|type|interface)\s+([A-Za-z0-9_]+)/g))
    names.push(m[1])
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of m[1].split(',')) {
      const n = part.trim().split(/\s+as\s+/).pop()
      if (n) names.push(n)
    }
  return names
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p)
  }
  return out
}

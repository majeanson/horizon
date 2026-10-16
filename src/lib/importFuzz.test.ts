import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { project } from '../engine/projection.ts'
import { intBetween, lcg } from '../engine/testGrid.ts'
import { readProfileJson } from './migrations.ts'
import { assumptionsOf } from './resultsModel.ts'
import { SCHEMA_VERSION } from './schema.ts'
import { exportProfileJson } from './store.ts'

// A FILE FROM OUTSIDE IS NOT TRUSTED. An import reads whatever a person (or a stale backup, or a bad editor) hands it. The promises: reading never throws (a throw at start is a white screen with the
// person's own profile held hostage), it ends in a clear `reason` or a profile that validates AGAIN after an export, it never changes what the language itself holds (prototype pollution), and a
// profile it ACCEPTS is one the engine can run to finite figures: a validator that lets through what the calculation cannot survive would turn a typo into a blank plan the next launch.

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const latest = readFileSync(join(dir, `profile.v${SCHEMA_VERSION}.json`), 'utf8')
const TODAY = { year: 2026, month: 10 }

/** What reading does with `text`, as a verdict: `refused` with its reason, or `accepted`; a throw is the one thing that must never happen. */
function outcome(text: string): { kind: 'refused'; reason: string } | { kind: 'accepted' } {
  const r = readProfileJson(text)
  return r.ok ? { kind: 'accepted' } : { kind: 'refused', reason: r.reason }
}

describe('a file that is not a profile is refused, never thrown on', () => {
  const junk: [string, string][] = [
    ['empty', ''],
    ['whitespace', '   \n  '],
    ['not json', 'this is not json'],
    ['a number', '42'],
    ['null', 'null'],
    ['a string', '"horizon"'],
    ['an array', '[1, 2, 3]'],
    ['an empty object', '{}'],
    ['the wrong app', '{"app":"other","version":25}'],
    ['a version from the future', `{"app":"horizon","version":${SCHEMA_VERSION + 1}}`],
    ['a version that is not a number', '{"app":"horizon","version":"25"}'],
    ['a negative version', '{"app":"horizon","version":-3}'],
    ['a fractional version', '{"app":"horizon","version":2.5}'],
    ['a huge version', '{"app":"horizon","version":1e308}'],
    ['binary noise', '\u0000\u0001\u0002{"app"'],
  ]
  for (const [name, text] of junk) {
    it(name, () => {
      expect(() => readProfileJson(text), name).not.toThrow()
      expect(outcome(text).kind, name).toBe('refused')
    })
  }

  it('a file from the future is « newer », not « invalid »: the person is told to update, not that the file is broken', () => {
    expect(outcome(`{"app":"horizon","version":${SCHEMA_VERSION + 1}}`)).toEqual({ kind: 'refused', reason: 'newer' })
  })
})

describe('a good file cut short, at every tenth of its length', () => {
  it('is refused as not JSON, each time, and never thrown on', () => {
    for (let i = 1; i < 10; i++) {
      const cut = latest.slice(0, Math.floor((latest.length * i) / 10))
      expect(() => readProfileJson(cut)).not.toThrow()
      expect(outcome(cut), `cut at ${i}0 %`).toEqual({ kind: 'refused', reason: 'json' })
    }
  })
})

describe('hostile shapes', () => {
  it('« __proto__ », « constructor » and « prototype » keys change nothing of the language', () => {
    const polluted = JSON.parse(latest) as Record<string, unknown>
    const evil = JSON.parse('{"__proto__": {"polluted": "yes"}, "constructor": {"prototype": {"polluted": "yes"}}, "prototype": {"polluted": "yes"}}')
    for (const target of [polluted, polluted.household as Record<string, unknown>, polluted.assumptions as Record<string, unknown>]) Object.assign(target, evil)
    const text = JSON.stringify(polluted)
    expect(() => readProfileJson(text)).not.toThrow()
    expect(readProfileJson(JSON.stringify({ ...JSON.parse(latest), ['__proto__']: { polluted: 'yes' } })).ok).toBeDefined()
    expect(({} as Record<string, unknown>).polluted, 'Object.prototype was changed').toBeUndefined()
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('a deeply nested array is refused or read, but does not take the page down', () => {
    const deep = '['.repeat(2_000) + ']'.repeat(2_000)
    expect(() => readProfileJson(`{"app":"horizon","version":${SCHEMA_VERSION},"household":${deep}}`)).not.toThrow()
  })

  it('a giant list of children, of plans and of pensions is refused without being read in full', () => {
    const base = JSON.parse(latest) as { household: { children: number[]; persons: { pensions: unknown[] }[] }; plans: unknown[] }
    base.household.children = Array.from({ length: 50_000 }, () => 2010)
    expect(outcome(JSON.stringify(base)).kind).toBe('refused')
    const base2 = JSON.parse(latest) as typeof base
    base2.household.persons[0].pensions = Array.from({ length: 50_000 }, () => ({}))
    expect(outcome(JSON.stringify(base2)).kind).toBe('refused')
    const base3 = JSON.parse(latest) as typeof base
    base3.plans = Array.from({ length: 5_000 }, () => ({ name: 'x', profile: {} }))
    expect(() => readProfileJson(JSON.stringify(base3))).not.toThrow()
  })

  it('a very long name and strange characters in it are read as text, and come back unchanged', () => {
    const p = JSON.parse(latest) as { household: { persons: { name: string }[] } }
    p.household.persons[0].name = 'é'.repeat(5_000) + '\u202e\u0000"\\</script>'
    const r = readProfileJson(JSON.stringify(p))
    if (r.ok) expect(r.profile.household.persons[0].name).toBe(p.household.persons[0].name)
    else expect(r.reason).toBe('invalid')
  })
})

describe('one leaf of a good profile replaced by something it should not be, four hundred times', { timeout: 300_000 }, () => {
  const EVIL: unknown[] = [null, 0, -1, 1, 0.5, 1e9, 1e15, 1e308, -1e308, 2 ** 53, '', 'x', '1e999', '9'.repeat(400), [], {}, true, false, [[]], { a: 1 }]

  type Path = (string | number)[]
  function leaves(v: unknown, path: Path = [], out: Path[] = []): Path[] {
    if (v !== null && typeof v === 'object') for (const [k, x] of Object.entries(v)) leaves(x, [...path, Array.isArray(v) ? Number(k) : k], out)
    else out.push(path)
    return out
  }
  function setAt(root: Record<string, unknown>, path: Path, value: unknown): void {
    let node: Record<string, unknown> = root
    for (const k of path.slice(0, -1)) node = node[k as string] as Record<string, unknown>
    node[path[path.length - 1] as string] = value
  }

  it('reading never throws; a profile that is accepted exports and reads back, and runs through the engine to finite figures', () => {
    const r = lcg(20261016)
    const base = JSON.parse(latest) as Record<string, unknown>
    const all = leaves(base).filter((p) => p[0] !== 'app' && p[0] !== 'version')
    const accepted: string[] = []
    const refused: Record<string, number> = {}
    for (let i = 0; i < 400; i++) {
      const path = all[intBetween(r, 0, all.length - 1)]
      const evil = EVIL[intBetween(r, 0, EVIL.length - 1)]
      const doc = structuredClone(base)
      setAt(doc, path, evil)
      const text = JSON.stringify(doc)
      const label = `${path.join('.')} := ${JSON.stringify(evil)?.slice(0, 40)}`
      let result: ReturnType<typeof readProfileJson>
      try {
        result = readProfileJson(text)
      } catch (e) {
        throw new Error(`reading THREW for ${label}: ${(e as Error).message}`)
      }
      if (!result.ok) {
        refused[result.reason] = (refused[result.reason] ?? 0) + 1
        continue
      }
      accepted.push(label)
      // accepted: it must survive an export and an import, and the engine must be able to run it
      const again = readProfileJson(exportProfileJson(result.profile))
      expect(again.ok, `an accepted profile is refused after its own export: ${label}`).toBe(true)
      const a = assumptionsOf(result.profile, TODAY)
      let rows: ReturnType<typeof project>
      try {
        rows = project(result.profile.household, a)
      } catch (e) {
        throw new Error(`the engine THREW on an accepted profile (${label}): ${(e as Error).message}`)
      }
      expect(rows.length, label).toBeGreaterThan(0)
      for (const row of rows) {
        expect(Number.isFinite(row.household.netWorthEnd) && Number.isFinite(row.household.tax), `${label} → year ${row.year} is not finite`).toBe(true)
      }
    }
    // the fuzz is only worth anything if it both refuses and accepts: a fuzz that refuses everything, or accepts everything, proves nothing
    expect(Object.values(refused).reduce((s, n) => s + n, 0), 'nothing was refused').toBeGreaterThan(100)
    expect(accepted.length, 'nothing was accepted').toBeGreaterThan(20)
  })
})

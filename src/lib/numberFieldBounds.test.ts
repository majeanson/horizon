import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { blankComments, openTags, sourceFiles } from './buildGuardScan'

// EVERY NUMBER BOX KNOWS THE LARGEST NUMBER THE SAVED PROFILE WILL ACCEPT.
//
// `NumberField` refuses an out-of-range value on the spot — but only against the `max` its page hands it. The profile
// schema (lib/schema.ts) validates only when a profile is LOADED, so a box with no `max` happily commits a figure the
// schema will refuse at the next launch, and a refused stored profile is stashed and replaced by a blank one. That is how
// « 150 000 » typed in an RRQ statement field (the schema stops at 100 000) used to erase a person's whole plan, one stray
// zero away. The page's `min`/`max` and the schema's range are two spellings of one fact; this guard holds the first half
// in place — a field with no `max` is the bug — and `store.save()` is the net under it.
//
// FAIL-CLOSED: a NumberField without a `max` fails the build unless its file is listed with the reason it is exempt.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')

const ALLOWED: Record<string, string> = {
  'pages/DevKit.tsx': 'the component gallery: specimens held in local state, never written to a profile',
}

function missingMax(src: string): string[] {
  return openTags(blankComments(src), 'NumberField').filter((tag) => !/\bmax=/.test(tag))
}

function scan(): { total: number; stray: Map<string, number> } {
  let total = 0
  const stray = new Map<string, number>()
  for (const f of sourceFiles(srcDir)) {
    if (!f.endsWith('.tsx')) continue
    const src = readFileSync(f, 'utf8')
    total += openTags(blankComments(src), 'NumberField').length
    const bad = missingMax(src).length
    if (bad > 0) stray.set(relative(srcDir, f).split(sep).join('/'), bad)
  }
  return { total, stray }
}

describe('every number box knows its largest number', () => {
  // The canary: pinned against the shapes that matter — a tag split over lines, a `max` hidden inside an arrow function
  // (not an attribute of the tag), a comment that mentions it, and a longer component name that must not count.
  it('the detector flags a box with no max, and only that', () => {
    const fixture = [
      `<NumberField kind="money" max={1e9} value={a} onChange={set} />`, // ok
      `<NumberField kind="money" value={b} onChange={set} />`, // ← flagged
      `<NumberField\n  kind="money"\n  allowEmpty\n  max={100_000}\n  value={c}\n/>`, // ok, over several lines
      `<NumberField\n  kind="money"\n  value={d}\n  onChange={(v) => edit({ max: v })}\n/>`, // ← flagged: `max:` is a key in a callback, not the prop
      `{/* <NumberField kind="money" value={e} /> */}`, // a comment
      `<NumberFieldBase kind="money" value={f} />`, // a different component
    ].join('\n')
    const flagged = missingMax(fixture)
    expect(flagged).toHaveLength(2)
    expect(flagged[0]).toContain('value={b}')
    expect(flagged[1]).toContain('value={d}')
  })

  const { total, stray } = scan()

  it('the scan reads the real fields (a guard that finds nothing passes for that reason)', () => {
    expect(total).toBeGreaterThan(40)
  })

  it('every NumberField declares a max, or its file says why not', () => {
    const bad = [...stray].filter(([f]) => !ALLOWED[f]).map(([f, n]) => `${f}: ${n}`)
    expect(
      bad,
      'a NumberField with no `max` can commit a figure the schema refuses at the next launch (and the profile is then blanked) — give it the schema\'s ceiling from lib/schema.ts',
    ).toEqual([])
  })

  it('no ALLOWED entry outlives the field it excuses (a stale exception reads as permission)', () => {
    expect(Object.keys(ALLOWED).filter((f) => !stray.has(f))).toEqual([])
  })
})

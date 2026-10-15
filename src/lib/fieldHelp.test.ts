import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { blankComments, openTags, sourceFiles } from './buildGuardScan'
import { FIELD_HELP, FIELD_HELP_WORDS, type HelpId } from './fieldHelpCopy'

// EVERY FIELD HAS ITS ⓘ.
//
// A FieldRow carries one of two notes: `infoId` — « Où trouver ce chiffre », for a figure printed on a document (fieldInfoCopy.test.ts holds those to
// official pages) — or `help` — « À propos de ce champ », for everything else: an age the person chooses, a rule of their pension plan, an estimate.
// A row with neither left a person alone in front of a box. FAIL-CLOSED: a row with neither fails the build unless its file says why below.
//
// And the words behind `help` are held like any copy: every entry used, both languages, nothing empty, no figure retyped.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')

const ALLOWED: Record<string, string> = {}

// An `infoId={cond ? 'x' : undefined}` is a row that is bare in one of its states: it counts as having no note.
function bare(src: string): string[] {
  return openTags(blankComments(src), 'FieldRow').filter((tag) => {
    const info = /\binfoId=/.test(tag) && !/\binfoId=\{[^}]*\bundefined\b/.test(tag)
    const help = /\bhelp=/.test(tag) && !/\bhelp=\{[^}]*\bundefined\b/.test(tag)
    return !info && !help
  })
}

function scan(): { total: number; stray: Map<string, number>; used: Set<string> } {
  let total = 0
  const stray = new Map<string, number>()
  const used = new Set<string>()
  for (const f of sourceFiles(srcDir)) {
    if (!f.endsWith('.tsx')) continue
    const src = readFileSync(f, 'utf8')
    const tags = openTags(blankComments(src), 'FieldRow')
    total += tags.length
    for (const tag of tags) for (const m of tag.matchAll(/\bhelp="([A-Za-z0-9]+)"/g)) used.add(m[1])
    const n = bare(src).length
    if (n > 0) stray.set(relative(srcDir, f).split(sep).join('/'), n)
  }
  return { total, stray, used }
}

describe('every field has its ⓘ', () => {
  it('the detector flags a row with neither note, and only that', () => {
    const fixture = [
      `<FieldRow label={a.x} infoId="salary">`, // ok
      `<FieldRow label={a.y} help="name">`, // ok
      `<FieldRow label={a.z} hint={a.zHint}>`, // ← flagged
      `<FieldRow\n  label={a.w}\n  hint={a.wHint}\n  help="birthYear"\n>`, // ok, over several lines
      `{/* <FieldRow label={a.v}> */}`, // a comment
      `<FieldRowish label={a.u}>`, // another component
      `<FieldRow label={a.t} infoId={marks ? 'spendingWorking' : undefined}>`, // ← flagged: bare when `marks` is false
    ].join('\n')
    const flagged = bare(fixture)
    expect(flagged).toHaveLength(2)
    expect(flagged[0]).toContain('a.z')
    expect(flagged[1]).toContain('a.t')
  })

  const { total, stray, used } = scan()

  it('the scan reads the real rows (a guard that finds nothing passes for that reason)', () => {
    expect(total).toBeGreaterThan(80)
  })

  it('every FieldRow has an infoId or a help note, or its file says why not', () => {
    const bad = [...stray].filter(([f]) => !ALLOWED[f]).map(([f, n]) => `${f}: ${n}`)
    expect(bad, 'give the row `infoId` (a figure on a document) or `help` (anything else) — lib/fieldHelpCopy.ts').toEqual([])
  })

  it('no ALLOWED entry outlives the row it excuses', () => {
    expect(Object.keys(ALLOWED).filter((f) => !stray.has(f))).toEqual([])
  })

  it('every help entry is used by a row (a note nobody can open goes stale unseen)', () => {
    const ids = Object.keys(FIELD_HELP.fr) as HelpId[]
    expect(ids.filter((id) => !used.has(id))).toEqual([])
  })
})

describe('the words of « À propos de ce champ »', () => {
  const ids = Object.keys(FIELD_HELP.fr) as HelpId[]

  it('has the same ids in both languages, each saying what the field is', () => {
    expect(Object.keys(FIELD_HELP.en).sort()).toEqual([...ids].sort())
    for (const lang of ['fr', 'en'] as const)
      for (const id of ids) expect(FIELD_HELP[lang][id].what.trim().length, `${lang}.${id}.what`).toBeGreaterThan(20)
  })

  it('says the same parts in both languages, and English is not French pasted', () => {
    for (const id of ids) {
      const fr = FIELD_HELP.fr[id]
      const en = FIELD_HELP.en[id]
      expect(Boolean(en.effect), `${id}.effect`).toBe(Boolean(fr.effect))
      expect(Boolean(en.where), `${id}.where`).toBe(Boolean(fr.where))
      expect(en.what, id).not.toBe(fr.what)
    }
    expect(FIELD_HELP_WORDS.fr.what).not.toBe(FIELD_HELP_WORDS.en.what)
  })

  it('retypes no rate (a percentage of the law belongs to engine/params, cited)', () => {
    for (const lang of ['fr', 'en'] as const)
      for (const id of ids) {
        const e = FIELD_HELP[lang][id]
        for (const text of [e.what, e.effect ?? '', e.where ?? '']) expect(text, `${lang}.${id}`).not.toMatch(/\d\s*(%| %)/)
      }
  })
})

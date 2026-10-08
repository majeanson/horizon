import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { blankComments, sourceFiles } from './buildGuardScan'

// THE KEYBOARD OPENS ON A TAP, NEVER ON ITS OWN.
//
// A planner is mostly typed into on a phone, and on a phone the on-screen keyboard takes half
// of whatever just opened: opening a person's page to READ it must not put the keyboard over
// it. The rule, in one line — a field REVEALED IN PLACE by the tap that asked for it (a ＋, a
// ✏️, a row tapped to edit) focuses: you just said you want to type. A SCREEN, SHEET or
// DIALOG OPENING never does: you have not said anything yet. One exception: a dialog whose
// ONLY content is that one field (a rename) — the dialog is the tap.
//
// « The form opens ready to type » is precisely the reason that is NOT one.
//
// FAIL-CLOSED: every file with an `autoFocus` attribute is listed below with the reason it is
// on the right side of that line. A new one fails the build until someone writes the reason.
//
// A KNOWN HOLE, named so a green run is not read as more than it is: this guard sees the JSX
// `autoFocus` ATTRIBUTE only. The same bug written imperatively — `ref={(el) => el?.focus()}`, or
// `.focus()` inside a `useEffect` that runs on mount — summons the keyboard exactly as `autoFocus`
// does and passes. Telling a mount-time `.focus()` from one in an event handler needs a parse, not
// a grep, so it is not attempted: review is what holds that line, and a new `.focus()` call outside
// a click/keydown handler should be read as a new `autoFocus`.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')

// A JSX `autoFocus` / `autoFocus={…}` attribute. Not a prop type (`autoFocus?:`), a destructure
// (`autoFocus,` / `autoFocus = false`), an object key (`autoFocus: open`) or a member read
// (`add.autoFocus`) — those carry a choice, they do not make one.
const ATTR = /(?<![.\w])autoFocus(?:=\{[^}\n]*\})?(?!\s*[=:?,)])/g

const PRIMITIVE = 'a primitive forwarding its CALLER’s choice — the caller is what this list judges'

const ALLOWED: Record<string, string> = {
  'components/EditField.tsx': PRIMITIVE,
  'components/NumberField.tsx': PRIMITIVE,
  // The first visit asks ONE question per screen: « Suivant » is the tap that reveals the next question's box in place,
  // and the box it reveals is what the tap asked to type into. The first screen (who is this for?) has no box, so
  // arriving on the page never summons the keyboard; only moving to a question with a box does.
  'components/Onboarding.tsx': 'the box appears in place on the « Suivant » / « Précédent » tap that asked for it; the landing screen has no box',
}

function lineOf(src: string, index: number): number {
  return src.slice(0, index).split('\n').length
}

function scan(): Map<string, number[]> {
  const out = new Map<string, number[]>()
  for (const f of sourceFiles(srcDir)) {
    if (!f.endsWith('.tsx')) continue
    const src = blankComments(readFileSync(f, 'utf8'))
    const lines = [...src.matchAll(ATTR)].map((m) => lineOf(src, m.index ?? 0))
    if (lines.length) out.set(relative(srcDir, f).split(sep).join('/'), lines)
  }
  return out
}

describe('the keyboard opens on a tap, never on its own', () => {
  // The canary. A grep guard that has never been red proves nothing, and this one asserts an
  // ABSENCE across the tree — so the detector is pinned against a fixture carrying real
  // attributes and the look-alikes that must NOT match.
  it('the detector sees a JSX attribute and none of its look-alikes', () => {
    const fixture = [
      `<input autoFocus />`, // ← 1
      `<input autoFocus={open} />`, // ← 2
      `autoFocus?: boolean`, // prop type
      `function F({ autoFocus, x }) {}`, // destructure
      `const o = { autoFocus: true }`, // object key
      `const v = add.autoFocus`, // member read
    ].join('\n')
    expect([...fixture.matchAll(ATTR)].map((m) => lineOf(fixture, m.index ?? 0))).toEqual([1, 2])
  })

  const found = scan()

  it('every autoFocus sits in a file that says why it is on the right side of the rule', () => {
    const stray = [...found].filter(([f]) => !ALLOWED[f]).map(([f, l]) => `${f}:${l.join(',')}`)
    expect(
      stray,
      'a new autoFocus — a screen, sheet or dialog OPENING must not summon the keyboard; if this one follows an explicit tap, add it to ALLOWED with that reason',
    ).toEqual([])
  })

  it('no ALLOWED entry outlives its autoFocus (a stale exception reads as permission)', () => {
    expect(Object.keys(ALLOWED).filter((f) => !found.has(f))).toEqual([])
  })
})

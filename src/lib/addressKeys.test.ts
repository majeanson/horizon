import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { blankComments, sourceFiles } from './buildGuardScan'

// THE ADDRESS IS A CONTRACT.
//
// Résultats keeps every choice in the address (`?v=&ages=&metric=…`) so a view can be bookmarked, shared with a spouse and left with the
// back button meaning what it says. That only works while each key is read the SAME way everywhere and an unknown or stale value lands
// somewhere sensible. A key added in a hurry — read in one place, written in another, never cleaned up — is how a bookmark opens a blank
// screen a year later.
//
// FAIL-CLOSED: every key the code reads or writes is listed below with who owns it and what an unknown value does. A new key fails the
// build until someone writes both. A key listed here that no code uses any more fails too (a stale line is a lie about the contract).
//
// A KNOWN HOLE, named so a green run is not read as more than it is: this guard sees keys written as string LITERALS in a `.get(…)`,
// `.set(…)`, `.delete(…)`, `.has(…)` on `params` / `search` / `next`, or as the first argument of `setParam(…)`. A key built from a variable
// passes unseen; review holds that line.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')

const KEY = /\b(?:params|search|next)\.(?:get|set|delete|has)\(\s*'([A-Za-z]+)'|\bsetParam\(\s*'([A-Za-z]+)'/g

/** key → who owns it, and what a value nobody knows does. */
const KEYS: Record<string, string> = {
  v: 'Résultats: the open view (answer · adjust · strategies · verify). Anything else lands on the answer and the key is dropped from the address.',
  ages: 'Résultats: the departure ages being compared (a number, or a split « 58-64 »). Unreadable parts are ignored; none left falls back to the default chips.',
  metric: 'Résultats: the chart (netWorth · income · detail). Unknown falls back to netWorth.',
  dollars: 'Résultats: today’s or nominal dollars. Unknown falls back to today’s.',
  age: 'Résultats: the « Combien épargner ? » age. Unreadable is ignored and the profile’s own is used.',
  spend: 'Résultats: the « Et si je dépensais moins ? » what-if amount. Unreadable is ignored: the slider sits on the profile’s own spending.',
  bp: 'Résultats › Stratégies: the person looked at. Unknown is the first person.',
  bb: 'Résultats › Stratégies: « pour les deux » (the other person starts at the same ages). Only « 1 » counts.',
  bt: 'Résultats › Stratégies: how the ways of starting are compared (cards · table). Anything else, or no key: the screen’s width chooses — a table from 860 px, cards below.',
  bw: 'Résultats › Stratégies: the window (bridge years or the whole plan). Unknown is the bridge years.',
  q: 'Résultats: an OLD deep link (`?q=save|stop`) turned into a scroll once, then dropped from the address.',
  person: 'Profil: an OLD deep link naming one person, turned into a scroll once, then dropped from the address.',
  form: 'Profil: « 1 » skips the first-visit question path and opens the full form.',
  etape: 'Saisie par document: the step open (you · rrq · tax · bank · employer · home · budget · residence). Anything else lands on the first step.',
  fact: 'Profil: one figure’s id (« self:rrspBalance »): scroll to its field and light it once, then drop the key from the address. An unknown id scrolls nowhere.',
}

function lineOf(src: string, index: number): number {
  return src.slice(0, index).split('\n').length
}

function scan(): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const f of sourceFiles(srcDir)) {
    if (!/\.(ts|tsx)$/.test(f) || /\.test\.|[\\/]engine[\\/]/.test(f)) continue
    const src = blankComments(readFileSync(f, 'utf8'))
    for (const m of src.matchAll(KEY)) {
      const key = m[1] ?? m[2]
      const where = `${relative(srcDir, f).split(sep).join('/')}:${lineOf(src, m.index ?? 0)}`
      out.set(key, [...(out.get(key) ?? []), where])
    }
  }
  return out
}

describe('the address is a contract', () => {
  // The canary: an ABSENCE guard that has never been red proves nothing, so the detector is pinned against a fixture.
  it('the detector sees a literal key read, written or removed, and none of its look-alikes', () => {
    const fixture = [
      `params.get('v')`, // 1 ←
      `next.set('ages', x)`, // 2 ←
      `next.delete("fact")`, // double quotes: not this codebase's style, named as a hole
      `setParam('spend', null)`, // 4 ←
      `params.get(key)`, // variable
      `other.get('v')`, // not an address object
      `localStorage.getItem('v')`,
    ].join('\n')
    expect([...fixture.matchAll(KEY)].map((m) => m[1] ?? m[2])).toEqual(['v', 'ages', 'spend'])
  })

  const found = scan()

  it('every key the code touches is listed, with its owner and what an unknown value does', () => {
    const stray = [...found].filter(([k]) => !KEYS[k]).map(([k, w]) => `${k} (${w.join(', ')})`)
    expect(stray, 'list the key in KEYS above with who owns it and what an unknown value does').toEqual([])
  })

  it('every listed key is still used, and says something', () => {
    const stale = Object.keys(KEYS).filter((k) => !found.has(k))
    expect(stale, 'remove a key no code reads or writes any more').toEqual([])
    for (const [k, why] of Object.entries(KEYS)) expect(why.length, k).toBeGreaterThan(20)
  })
})

import { useCallback, useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import type { Profile } from './schema'
import { defaultSelections, formatSelections, isSplit, pairSelection, parseSelections, splitAges, toggleSelection, type Selection } from './resultsModel'

// THE COMPARISONS OF THE RESULTS PAGE — the departure ages the person has put side by side (`?ages=`), how they are added and removed, and how each is named. One third of what
// lib/useResultsPage.ts used to hold. The address is the truth; `pending` carries the last click until the address has caught up with it.

export function useResultsComparisons(profile: Profile, everyoneRetired: boolean, params: URLSearchParams, setParam: (key: string, value: string | null) => void, gapsCount: number) {
  const t = useT()
  const r = t.results
  // A « chacun son âge » split names two people: on a one-person household it would only duplicate a plain age.
  const selections = parseSelections(params.get('ages'), defaultSelections(profile.household, everyoneRetired)).filter((s) => !isSplit(s) || profile.household.persons.length > 1)
  const picked = formatSelections(selections)

  // On a phone the rail may show only its first chips: bring the ones already switched on into view, once. SIDEWAYS
  // INSIDE THE RAIL ONLY — `scrollIntoView` scrolls every ancestor too, and with the rail below the fold it used to
  // scroll the whole page down by the height of the answer, so the page opened with its first sentence hidden.
  const compareRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const rail = compareRef.current?.querySelector<HTMLElement>('.rail')
    const chip = rail?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!rail || !chip) return
    const c = chip.getBoundingClientRect()
    const box = rail.getBoundingClientRect()
    if (c.left < box.left || c.right > box.right) rail.scrollTo({ left: Math.max(0, rail.scrollLeft + (c.left - box.left) - (box.width - c.width) / 2) })
  }, [gapsCount])

  // The comparisons as the LAST click left them: the URL (and so `selections`) only catches up when the page has
  // re-rendered, and a quick second tap must build on the first, not on the stale list.
  const pending = useRef<{ text: string; at: number } | null>(null)
  const agesNow = params.get('ages')
  useEffect(() => {
    if (pending.current && agesNow === pending.current.text) pending.current = null
  }, [agesNow])
  const latest = (): Selection[] => (pending.current && Date.now() - pending.current.at < 2000 ? parseSelections(pending.current.text, []) : selections)
  const commit = (next: Selection[]) => {
    const text = formatSelections(next)
    pending.current = { text, at: Date.now() }
    setParam('ages', text)
  }
  const toggle = (s: Selection) => commit(toggleSelection(latest(), s))
  // A person with no name is « Moi » / « Partenaire », as on the profile page.
  const names = profile.household.persons.map((p, i) => p.name.trim() || (i === 0 ? t.profile.self : t.profile.spouse))
  // « Mon plan » always says the age: each person's own retirement age, once when they agree (« 60 »), else « 60 / 62 ».
  const planAges = [...new Set(profile.household.persons.map((p) => p.retirementAge))].join(' / ')
  const label = useCallback(
    (s: Selection) => {
      if (s === 'plan') return r.compare.planAt(planAges)
      if (!isSplit(s)) return r.compare.age(s)
      const [a, b] = splitAges(s)
      return r.compare.split(names[0] ?? '', a, names[1] ?? '', b)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [r, names.join('|'), planAges],
  )
  /** Add a couple's pair to the comparison; false when the pair is no selection (resultsModel `pairSelection`), so the caller does not switch to a view it did not change. */
  const addSplit = (first: number, second: number): boolean => {
    const s = pairSelection(first, second)
    if (s === null) return false
    const cur = latest()
    if (!cur.includes(s)) commit(toggleSelection(cur, s))
    return true
  }
  // Any other age is typed: a box instead of one chip per age from today's to 70 — twenty look-alike pills were the page's
  // loudest row, and the three milestones plus the answer's own age are what people actually compare against.
  const [otherAge, setOtherAge] = useState<number | null>(null)
  const addAge = (age: number | null) => {
    setOtherAge(null)
    if (age === null) return
    const cur = latest()
    if (!cur.includes(age)) commit(toggleSelection(cur, age))
  }

  return { selections, picked, compareRef, pending, commit, toggle, names, planAges, label, addSplit, otherAge, setOtherAge, addAge }
}

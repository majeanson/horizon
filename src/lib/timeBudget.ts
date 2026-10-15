import { useSyncExternalStore } from 'react'
import { isPreview } from './preview'
import { framed } from './readingHelp'

// « COMBIEN DE TEMPS AVEZ-VOUS ? » — the front door's second question, right after the reading dialog (components/TimeBudget.tsx): two minutes,
// fifteen, thirty and more. It is a preference of THIS device, like the text size — never part of the profile — and the app reads it in two places:
// the front door shapes itself around it (the matching door becomes the one « Commencer », the others fold away, two minutes folds the explanations),
// and a Profil tab tapped with no way in named takes the matching path (pages/Profil.tsx). It can always be changed: « Changer » on the front door,
// and a row on the settings page.

export const TIME_BUDGETS = ['2', '15', '30'] as const
export type TimeBudget = (typeof TIME_BUDGETS)[number]

export const TIME_BUDGET_KEY = 'horizon-time'
/** The stored mark of « Plus tard » (or ✕, or Escape): asked, nothing chosen — the question does not come back by itself. */
const LATER = 'later'
const CHANGE = 'horizon:time-budget'

/** The way in each budget opens: the SAME addresses as the front door's doors (welcomeCopy.test.ts holds the two equal). A bare `/profil` is the
 *  full questions — fifteen minutes needs no key, so the Profil tab is the right door by itself. */
export const TIME_BUDGET_PATH: Record<TimeBudget, string> = {
  '2': '/profil?debut=rapide',
  '15': '/profil?debut=complet',
  '30': '/profil?form=1&par=document&etape=gather',
}

const isBudget = (v: string | null): v is TimeBudget => (TIME_BUDGETS as readonly string[]).includes(v ?? '')

/** The budget chosen on this device, or null (never asked, put off, or a storage that cannot be read). */
export function getTimeBudget(): TimeBudget | null {
  try {
    const v = localStorage.getItem(TIME_BUDGET_KEY)
    return isBudget(v) ? v : null
  } catch {
    return null
  }
}

/** True once the question was answered OR put off on this device — and inside a frame or the portfolio preview, where a dialog is not the product. */
export function timeBudgetAsked(): boolean {
  if (framed() || isPreview()) return true
  try {
    const v = localStorage.getItem(TIME_BUDGET_KEY)
    return v === LATER || isBudget(v)
  } catch {
    return false
  }
}

/** A choice, or null for « Plus tard ». A refused storage keeps the choice for the visit only (the hook still re-renders). */
export function setTimeBudget(b: TimeBudget | null): void {
  try {
    localStorage.setItem(TIME_BUDGET_KEY, b ?? LATER)
  } catch {
    /* storage blocked: the front door still reshapes for this visit */
  }
  window.dispatchEvent(new Event(CHANGE))
}

const subscribe = (cb: () => void) => {
  window.addEventListener(CHANGE, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(CHANGE, cb)
    window.removeEventListener('storage', cb)
  }
}

export const useTimeBudget = (): TimeBudget | null => useSyncExternalStore(subscribe, getTimeBudget, getTimeBudget)

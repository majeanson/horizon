import { useSyncExternalStore } from 'react'

// « COMBIEN DE TEMPS AVEZ-VOUS ? » — asked in the front door's one dialog, opened by its « Commencer » (components/WelcomeDialog.tsx): two minutes,
// fifteen, thirty and more. Each answer is a door: it is kept, and it opens its own path at once. It is a preference of THIS device, like the text
// size — never part of the profile — and the app reads it in three places: the dialog marks the answer already given, a Profil tab tapped with no way
// in named takes the matching path (pages/Profil.tsx), and the settings page has a row to change it.

export const TIME_BUDGETS = ['2', '15', '30'] as const
export type TimeBudget = (typeof TIME_BUDGETS)[number]

export const TIME_BUDGET_KEY = 'horizon-time'
const CHANGE = 'horizon:time-budget'

/** The way in each budget opens — the dialog's doors lead here. A bare `/profil` is the full questions, but the fifteen-minute door still NAMES them:
 *  a reader who once chose two minutes and now picks fifteen must not be sent back to the quick path. */
export const TIME_BUDGET_PATH: Record<TimeBudget, string> = {
  '2': '/profil?debut=rapide',
  '15': '/profil?debut=complet',
  '30': '/profil?form=1&par=document&etape=gather',
}

const isBudget = (v: string | null): v is TimeBudget => (TIME_BUDGETS as readonly string[]).includes(v ?? '')

/** The budget chosen on this device, or null (never chosen, a storage that cannot be read — or the « later » an earlier version stored). */
export function getTimeBudget(): TimeBudget | null {
  try {
    const v = localStorage.getItem(TIME_BUDGET_KEY)
    return isBudget(v) ? v : null
  } catch {
    return null
  }
}

/** A refused storage keeps the choice for the visit only (the hook still re-renders). */
export function setTimeBudget(b: TimeBudget): void {
  try {
    localStorage.setItem(TIME_BUDGET_KEY, b)
  } catch {
    /* storage blocked: the choice lasts this visit */
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

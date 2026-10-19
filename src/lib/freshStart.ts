import { setContrast, setTextScale } from './accessibility.ts'
import { setBasis } from './levelBasis.ts'
import { isPreview } from './preview.ts'
import type { Profile } from './schema.ts'
import { clearProfile } from './store.ts'
import { setTheme } from './theme.ts'

// « REPARTIR À NEUF » (pages/Donnees.tsx): the device as a first visit finds it. Everything Horizon keeps here goes — the profile and its unreadable
// copies, the backup stamps, the time once chosen (« Combien de temps avez-vous ? »), the display choices, the checklist's
// ticks, « Ma situation »'s answers, where the typing stopped, the install card's « plus tard » — and the front door is a first visit's again.
// ONE thing stays: the language. It is how the person reads the page, not something they did in it, and flipping it under the confirm they just
// answered would be a jolt.
//
// The keys are swept by their PREFIX rather than listed: every module keeps its own under `horizon-…` (public/theme-bootstrap.js and the e2e seed read
// the same names; freshStart.test.ts holds every write in src to the prefix), so a key added tomorrow is forgotten with the rest without this file
// knowing it. The modules that also hold a copy in memory — the store, the display attributes on <html>, the level basis — are reset through their own
// setters first; the key a setter writes is taken by the sweep that follows.

const PREFIX = 'horizon-'

/** The keys a fresh start keeps, each with its reason in the comment above. */
export const KEPT_ON_FRESH_START: readonly string[] = ['horizon-lang']

export function freshStart(): void {
  // The portfolio preview never touches this device's storage (lib/preview.ts): the visitor's own profile may be under it.
  if (isPreview()) return
  clearProfile()
  setContrast('normal')
  setTextScale('normal')
  setTheme(prefersNight() ? 'night' : 'day')
  setBasis('observed')
  sweep(localStorage)
  sweep(sessionStorage)
}

/** The theme a device with no saved choice paints (the same rule as public/theme-bootstrap.js). */
function prefersNight(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

function sweep(storage: Storage): void {
  try {
    const gone: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k !== null && k.startsWith(PREFIX) && !KEPT_ON_FRESH_START.includes(k)) gone.push(k)
    }
    for (const k of gone) storage.removeItem(k)
  } catch {
    /* a storage that keeps nothing has nothing to forget */
  }
}

/**
 * Does this profile look like somebody's — a figure typed, a name, a second person, a child, a plan? A fresh start over one asks first; over a blank
 * one it simply happens. The years of birth are not read: a date alone is not a household, and the blank profile carries one.
 */
export function profileLooksReal(p: Profile): boolean {
  const h = p.household
  if (h.persons.length > 1 || (h.children?.length ?? 0) > 0 || h.home != null || (h.flows?.length ?? 0) > 0) return true
  if (h.spending.workingToday > 0 || h.spending.retiredToday > 0 || p.confirmed.length > 0 || p.plans.length > 0) return true
  return h.persons.some(
    (x) =>
      x.name.trim() !== '' ||
      x.salaryToday > 0 ||
      Object.keys(x.earningsHistory).length > 0 ||
      x.pensions.length > 0 ||
      x.accounts.rrsp.balance > 0 ||
      x.accounts.tfsa.balance > 0 ||
      x.accounts.nonReg.balance > 0,
  )
}

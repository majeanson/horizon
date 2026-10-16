import { flushSync } from 'react-dom'

// CHANGING PAGE THE WAY AN APP DOES — a short slide-and-fade started by the browser's view transition, with the two bars holding still (styles/phone.css gives them a layer
// of their own for the length of the move). Loaded when a link of the shell is tapped (components/AppShell.tsx; it is also fetched once the page is idle, so the first tap
// does not wait for it). The router (BrowserRouter) does not start a view transition by itself; the navigation is flushed inside the transition's callback so the browser
// snapshots the page that is leaving and the page that arrives. No API, or reduced motion: the page just changes.
//
// The slide follows the order of the three tabs — Profil → Résultats → Hypothèses go forward (the new page arrives from the right), the other way back — and any other
// move (the sheet, the glossary, the settings, the brand) is a plain fade. `html[data-vt]` says which for the length of the transition, and it is also what gives the bars a
// layer: at rest nothing carries a transition name.

const TAB_ORDER = ['/profil', '/resultats', '/hypotheses']

/** Which way a move between two paths reads: along the tabs forward or back, or neither. Pure, so it is tested without a browser. */
export function transitionKind(from: string, to: string): 'forward' | 'back' | 'fade' {
  const a = TAB_ORDER.indexOf(from)
  const b = TAB_ORDER.indexOf(to)
  if (a < 0 || b < 0 || a === b) return 'fade'
  return b > a ? 'forward' : 'back'
}

export function changePage(to: string, navigate: (to: string) => void, from: string = window.location.pathname): void {
  const doc = document as Document & { startViewTransition?: (update: () => void) => { finished: Promise<unknown> } }
  if (!doc.startViewTransition || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return navigate(to)
  const root = document.documentElement
  root.setAttribute('data-vt', transitionKind(from, to.split(/[?#]/)[0]))
  const done = () => root.removeAttribute('data-vt')
  doc.startViewTransition(() => flushSync(() => navigate(to))).finished.then(done, done)
}

import { flushSync } from 'react-dom'

// CHANGING PAGE THE WAY AN APP DOES — a short cross-fade, started by the browser's view transition, with the two bars holding still (styles/phone.css gives
// them a layer of their own). Loaded only when an installed app's bottom tab is tapped (components/AppShell.tsx), so a tab in a browser never carries it. The
// router (BrowserRouter) does not start a view transition by itself; the navigation is flushed inside the transition's callback so the browser snapshots the
// page that is leaving and the page that arrives. No API, or reduced motion: the page just changes.
export function changePage(to: string, navigate: (to: string) => void): void {
  const doc = document as Document & { startViewTransition?: (update: () => void) => unknown }
  if (!doc.startViewTransition || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return navigate(to)
  doc.startViewTransition(() => flushSync(() => navigate(to)))
}

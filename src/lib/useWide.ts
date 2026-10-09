import { useSyncExternalStore } from 'react'

// Is the window at least as wide as the desktop layout (860 px, the same breakpoint the shell and the stylesheet use)? For the few choices a
// stylesheet cannot make — which of two arrangements is the DEFAULT while the reader has not said — and nothing else: layout stays in CSS.
const QUERY = '(min-width: 860px)'

const subscribe = (notify: () => void): (() => void) => {
  const m = window.matchMedia(QUERY)
  m.addEventListener('change', notify)
  return () => m.removeEventListener('change', notify)
}

export const useWide = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )

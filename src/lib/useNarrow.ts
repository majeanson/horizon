import { useSyncExternalStore } from 'react'

// Is the window a phone's (under 480 px, the breakpoint the stylesheet's phone rules use)? For the few arrangements a stylesheet cannot make — which parts are
// FOLDED to one row — and nothing else: layout stays in CSS. (useWide.ts is the desktop twin.)
const QUERY = '(max-width: 479px)'

const subscribe = (notify: () => void): (() => void) => {
  const m = window.matchMedia(QUERY)
  m.addEventListener('change', notify)
  return () => m.removeEventListener('change', notify)
}

export const useNarrow = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )

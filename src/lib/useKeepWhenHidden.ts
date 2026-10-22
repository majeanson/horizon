import { useEffect, useRef } from 'react'
import { flushProfile } from './store'

// A tab closed, an app swiped away or a phone locked MID-TYPING never blurs the box: the figure on screen would be lost with the page. When the page is
// hidden with a draft still being typed, `commit` keeps it (if it reads: the same rules as a blur) and the profile is written at once, behind the store's
// own flush, which runs first and would otherwise miss the edit.
export function useKeepWhenHidden(typing: () => boolean, commit: () => void): void {
  const latest = useRef({ typing, commit })
  latest.current = { typing, commit }
  useEffect(() => {
    const keep = () => {
      if (!latest.current.typing()) return
      latest.current.commit()
      flushProfile()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') keep()
    }
    window.addEventListener('pagehide', keep)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', keep)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}

// Honour prefers-reduced-motion in JS-DRIVEN scrolling. CSS animations gate themselves
// via @media; the imperative scrollIntoView/scrollTo calls need this equivalent — a long
// smooth glide across a page is significant motion. Read live per call (not cached at
// module load) so flipping the OS setting applies to the very next scroll.
export function scrollBehavior(): ScrollBehavior {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  } catch {
    return 'smooth'
  }
}

// « The thing I just opened must be ON SCREEN. »
//
// `block: 'nearest'` is the whole point and is deliberately NOT 'center' or 'start': it
// scrolls the MINIMUM needed, so a field already comfortably visible does not move at all.
// A composer that yanks the page every time you tap it is worse than one that occasionally
// sits low — which also makes this safe to call unconditionally from a shared primitive.
//
// Deferred one frame: the element to reveal (a dropdown, an expanded composer) is usually
// mounted by the very render that calls this, so its box does not exist yet. Returns a
// cancel for the effect cleanup.
export function revealOnOpen(el: HTMLElement | null): () => void {
  if (!el) return () => {}
  const raf = requestAnimationFrame(() => {
    if (!el.isConnected) return
    el.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest', inline: 'nearest' })
  })
  return () => cancelAnimationFrame(raf)
}

// « Take me to that section » — and KEEP me there while the page settles. On Résultats the sections above a target keep
// streaming in for a moment (a worker's answer replacing a placeholder, a lazy chart), so a tapped section that had
// stopped under the pinned bar slid up or down a beat later. The first scroll is the reader's (smooth, when allowed);
// from then on any change of the page's height re-anchors the target without animation. It lets go only when BOTH hold:
// `minMs` has passed since the tap (a slow phone's or runner's workers answer seconds late, and a page that has not
// changed yet is not a page that has settled: letting go after a short quiet spell made a CI landing test fail) AND the
// page has been quiet for `quietMs`; `maxMs` is the end whatever happens. The reader's own wheel, touch or key hands
// the scroll back at once. Returns a cancel.
// …once the section EXISTS. A link to a section of another view switches the view, and that view is a lazy chunk: one frame
// later its sections may not be on the page yet, and `scrollToSection` on an id that is not there does nothing, silently.
// This waits for the anchor (a frame, then every 50 ms, for at most `waitMs`) and then hands over to `scrollToSection`, whose own
// hold keeps the landing while the page settles. Returns a cancel for the wait AND the hold.
export function scrollToSectionWhenThere(id: string, waitMs = 5000): () => void {
  const started = Date.now()
  let cancelled = false
  let release: () => void = () => {}
  let timer: ReturnType<typeof setTimeout> | undefined
  const tick = () => {
    if (cancelled) return
    if (document.getElementById(id)) {
      release = scrollToSection(id)
      return
    }
    if (Date.now() - started < waitMs) timer = setTimeout(tick, 50)
  }
  const frame = requestAnimationFrame(tick)
  return () => {
    cancelled = true
    cancelAnimationFrame(frame)
    clearTimeout(timer)
    release()
  }
}

export function scrollToSection(id: string, maxMs = 10000, quietMs = 1500, minMs = 4000): () => void {
  const target = document.getElementById(id)
  if (!target) return () => {}
  target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
  const started = Date.now()
  let quiet: ReturnType<typeof setTimeout>
  const settle = () => {
    clearTimeout(quiet)
    quiet = setTimeout(release, Math.max(quietMs, minMs - (Date.now() - started)))
  }
  const hold = () => {
    if (target.isConnected) target.scrollIntoView({ block: 'start' })
    settle()
  }
  // The page scrolls INSIDE #root (the document itself never does: core.css), so the body never changes size when a section above the target grows or
  // shrinks — it is the root's content that does. Watching the body, as this once did, re-anchored nothing.
  const content = document.getElementById('root')?.firstElementChild ?? document.body
  const observer = new ResizeObserver(hold)
  observer.observe(content)
  const events = ['wheel', 'touchstart', 'keydown'] as const
  const release = () => {
    observer.disconnect()
    clearTimeout(timer)
    clearTimeout(quiet)
    for (const ev of events) window.removeEventListener(ev, release)
  }
  const timer = setTimeout(release, maxMs)
  settle()
  for (const ev of events) window.addEventListener(ev, release, { once: true, passive: true })
  return release
}

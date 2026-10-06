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

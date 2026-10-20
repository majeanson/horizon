import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useT } from '../i18n'
import { Cluster } from './Layout'
import { SkeletonLines, SkeletonStatus } from './Skeleton'

// THE SHAPED PLACEHOLDERS THAT ONLY THE LAZY PAGES USE — ghost text, ghost chips, a slider's and a chart's wait, a ghost of real components (the « why » of shaped waits
// is in components/Skeleton.tsx, above SkeletonLines). They live apart from Skeleton.tsx because the shell imports that file for the route's wait: what only the results
// pages draw must not ride the door (scripts/check-bundle.mjs).

/** A block that fills its host (a chart's slot, whose height is already the chart's): the wait for a lazily-loaded picture. */
export function SkeletonFill() {
  const t = useT()
  return (
    <div className="skeleton__fill" data-placeholder="">
      <p className="sr-only" role="status">
        {t.common.loading}
      </p>
      <div className="skeleton__block" aria-hidden="true" />
    </div>
  )
}

/** A lazily-loaded `Slider` while its chunk arrives, in the slider's own classes: its real label, a value line, the two step buttons as ghosts, the track and its ends. */
export function SliderSkeleton({ label }: { label: string }) {
  return (
    <div className="slider" data-placeholder="">
      <SkeletonStatus />
      <div className="slider__head" aria-hidden="true">
        <span className="skeleton-as-field-row__label">{label}</span>
        <span className="skeleton-as-slider__value skeleton-as-mono skeleton__value">
          <SkeletonLines widths={[100]} />
        </span>
      </div>
      <div className="slider__row" aria-hidden="true">
        <span className="skeleton-as-btn skeleton-as-btn--icon skeleton-as-btn--ghost slider__step skeleton__ghost">−</span>
        <div className="slider__track">
          <div className="skeleton__track">
            <span className="skeleton__block" />
          </div>
        </div>
        <span className="skeleton-as-btn skeleton-as-btn--icon skeleton-as-btn--ghost slider__step skeleton__ghost">+</span>
      </div>
      <div className="slider__ends skeleton-as-mono" aria-hidden="true">
        <SkeletonLines widths={[100]} />
      </div>
    </div>
  )
}

/** GHOST TEXT: the sentence the content will most likely say, built with a likely figure whose digits are drawn as letters (« oo ans » — never digits, so no search
 *  for a figure can take the ghost for the answer), drawn as a wash with the words unseen. It wraps exactly as the real sentence will, at any width, text size and language: use it
 *  when the words are known but the figure is not; `SkeletonLines` when nothing is. */
export function SkeletonText({ children }: { children: string }) {
  // The words are NOT text of the page: CSS draws them from `data-ghost` (::before), so no search, no screen reader and no test reads a placeholder for the
  // answer (one did: « Vous pouvez prendre votre retraite » was found in the ghost and its age read before there was one).
  return <span className="skeleton__text" data-placeholder="" aria-hidden="true" data-ghost={children.replace(/\d/g, 'o')} />
}

/** A row of doors (chips) waiting, each a ghost of its real label in a chip's own size and the row's own wrapping: the row is as tall as it will be. */
export function SkeletonChips({ labels }: { labels: readonly string[] }) {
  return (
    <Cluster className="skeleton__chip-row" data-placeholder="" aria-hidden="true">
      {labels.map((l) => (
        <span key={l} className="skeleton__chip" data-ghost={l} />
      ))}
    </Cluster>
  )
}

/** A GHOST OF REAL COMPONENTS: the surface's own controls and layout (its tabs, its cards, its table) rendered with stand-in figures, inert and hidden from assistive
 *  technology, their words unseen and their controls drawn as the placeholder's wash. For a surface too intricate to sketch by hand, this is the exact size: it IS the
 *  layout. Every digit of its text becomes a letter (as in `SkeletonText`), so no search for a figure can take the ghost for the answer. */
export function SkeletonGhost({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const walk = document.createTreeWalker(box.current!, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n !== null; n = walk.nextNode()) if (/\d/.test(n.nodeValue ?? '')) n.nodeValue = n.nodeValue!.replace(/\d/g, 'o')
  })
  return (
    <div ref={box} className="skeleton__ghost-tree" data-placeholder="" inert aria-hidden="true">
      {children}
    </div>
  )
}

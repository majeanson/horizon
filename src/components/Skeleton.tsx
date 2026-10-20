import type { CSSProperties } from 'react'
import { useT } from '../i18n'
// The waiting state for a surface whose SHAPE is already known — a list of rows, a
// grid of cards. Instead of one centred « Chargement… » line that pops into a full
// page, reserve the space the content is about to take, so the first paint is
// already the right size and nothing jumps under a thumb already reaching for it.
//
// Generalized from the board's own ghost tiles (`.board-skeleton`, 5c64b3e), which
// proved the idea on the one surface that most needed it and then stayed there.
//
// CALM, and that is a real constraint here: the one movement is a slow, soft sweep of
// the accent wash across the blocks (styles/motion.css, a transform on a pseudo-element,
// off under reduced motion) — Marc asked for it on 2026-10-16, where it used to be
// « no shimmer, no pulse » (NFR-CALM). Never a pulse of the blocks' own opacity, never
// fast, never on a surface that is not actually loading.
//
// WHEN NOT TO USE IT. A skeleton is a promise about shape. If the surface has no
// predictable shape — a form scene, cook mode, a single record — that promise is a
// lie and the honest thing is the `<Loading/>` line, which is why both still exist.
// The rule: does the reader already know roughly what will appear here? Rows → yes.
// A recipe you have never opened → no.
//
// ACCESSIBILITY. The blocks are decorative and `aria-hidden`; the real message for a
// screen reader is one polite live line, so AT hears "Chargement…" once instead of
// counting eight empty divs.
export function Skeleton({
  count = 3,
  variant = 'row',
  className,
}: {
  /** How many placeholders. Match the surface's typical first screen, not its max. */
  count?: number
  /** `row` = a stacked list; `card` = a responsive grid of tiles. */
  variant?: 'row' | 'card'
  className?: string
}) {
  const t = useT()
  return (
    <>
      <p className="sr-only" role="status">
        {t.common.loading}
      </p>
      <div
        data-placeholder=""
        className={`skeleton skeleton--${variant}` + (className ? ` ${className}` : '')}
        aria-hidden="true"
      >
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="skeleton__block" />
        ))}
      </div>
    </>
  )
}

// SHAPED PLACEHOLDERS. A row of identical bars promises a shape and then breaks it: the answer's card waited as three bars 120 px tall and arrived 1 000 px tall,
// and everything under it jumped (Marc, 2026-10-20: « I don't like when the layout changes after a loading »). The cure is to wait INSIDE the real layout:
// render the elements the content will be — `<p className="verdict__line">`, the `.glance` grid, a `.chart-slot` — and put placeholder lines in them. Each line
// is one line of its HOST's type (`1lh`: its own font size and line height), so the placeholder is as tall as the text it stands for, at every text size,
// in either language, at any width. A surface built this way says « Chargement… » once, with `SkeletonStatus`.

/** One placeholder line per entry, each as wide as its percentage — inside the element the text will be. */
export function SkeletonLines({ widths }: { widths: readonly number[] }) {
  return (
    <>
      {widths.map((w, i) => (
        <span key={i} className="skeleton__line" data-placeholder="" aria-hidden="true" style={{ '--w': `${w}%` } as CSSProperties}>
          <span className="skeleton__block" />
        </span>
      ))}
    </>
  )
}

/** The one « Chargement… » a shaped placeholder says to a screen reader — its lines are decorative. */
export function SkeletonStatus() {
  const t = useT()
  return (
    <p className="sr-only" role="status">
      {t.common.loading}
    </p>
  )
}

/** The wait for a whole page (a route's chunk) or a whole part of one (Décider's view, the proof): the page's head in its own type, then card-sized blocks, and at least
 *  the rest of a screen — so what sits under the page (the next-step card, the footer) is never seen in the gap and then pushed away. `head` off for a part of a page. */
export function PageSkeleton({ head = true }: { head?: boolean }) {
  return (
    // a whole page sits in the page's own frame (its gutters and rhythm); a part of a page is already in it
    <div className={'skeleton--screen' + (head ? ' skeleton-as-page-body' : '')} data-placeholder="">
      <SkeletonStatus />
      {head && (
        // the head's own TYPE under classes of its own: a page's real head is what a reader (and a test) waits for, and a placeholder never passes for it
        <div className="skeleton__page-head" aria-hidden="true">
          <p className="skeleton__page-title">
            <SkeletonLines widths={[45]} />
          </p>
          <p className="skeleton__page-sub">
            <SkeletonLines widths={[90, 40]} />
          </p>
        </div>
      )}
      <div className="skeleton skeleton--row skeleton--cards" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton__block" />
        ))}
      </div>
    </div>
  )
}

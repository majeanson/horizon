import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ConceptPip } from './ConceptPip'
import { Icon, InlineIcon, type IconName } from './Icon'
import type { ConceptId } from '../lib/concepts'
import { useHScroll } from '../lib/hscroll'
import { useT } from '../i18n'

// SubTabs — the app-wide segmented "one job at a time" control (the `.subtabs` family in
// styles/core.css): one calm pill row, the active tab filled with the surface accent.
// Reuse this rather than re-hand-rolling the .subtabs markup. Horizon uses it for the
// « Moi / Conjoint·e » switch on the profile and for the scenario picker on the results.

export interface SubTabOption<K extends string> {
  key: K
  label: ReactNode
  // Optional leading glyph (the shared <Icon> set — never an emoji).
  icon?: IconName
  // The idea the tab names: its pip (glyph + family colour, lib/concepts.ts) before the label.
  concept?: ConceptId
  // Accessible name + tooltip for a segment whose `label` carries no text (an icon-only
  // tab). Without it such a tab reaches AT as an unnamed button.
  ariaLabel?: string
  // The household position (0 first person, 1 second) of a tab that stands for a PERSON: a dot in that person's colour
  // before the name — never the only cue, the name is the label.
  who?: 0 | 1
  // A tab that stands for one of the three scenarios (prudent · neutral · bold): a dot in the scenario's colour, the same
  // hue as on the sliders and in the charts. The name stays the label.
  tone?: 'prudent' | 'neutral' | 'bold'
}

export function SubTabs<K extends string>({
  options,
  value,
  onSelect,
  ariaLabel,
  trailing,
  size,
  arrows,
  className,
}: {
  options: ReadonlyArray<SubTabOption<K>>
  value: K
  onSelect: (key: K) => void
  ariaLabel: string
  // A trailing control on the row.
  trailing?: ReactNode
  // 'mini' = the compact variant (`.subtabs--mini`).
  size?: 'mini'
  /** Force the paging chevrons on (or off). Defaults to "on unless mini" — a mini row
   *  usually holds 2–3 segments and nothing else, but a mini row that ALSO carries
   *  trailing controls can overflow like any other, so the host says `arrows`. */
  arrows?: boolean
  // Extra class on the `.subtabs` group.
  className?: string
}) {
  const group = 'subtabs' + (size === 'mini' ? ' subtabs--mini' : '') + (className ? ' ' + className : '')

  const t = useT()

  // The row hides its scrollbar (calm), so when the segments outgrow the width a MOUSE has
  // no way to reach the tabs past the right edge — no bar to drag, and a vertical wheel
  // does not scroll sideways. useHScroll maps the wheel; the ‹ › chevrons below are the
  // visible affordance (CSS shows them on a fine pointer only — a touch surface swipes the
  // row and does not need them eating the pill's width).
  const hs = useHScroll<HTMLDivElement>()
  const { ref: tablistRef, toView, overflowing } = hs

  // Keep the selected tab in view. Jump without animating on the first paint; glide on
  // later changes. Deps are the STABLE pieces of `hs` (it is a fresh object each render):
  // re-scrolling on every render would fight the user's own scrolling.
  const settled = useRef(false)
  useEffect(() => {
    const active = tablistRef.current?.querySelector('[role="tab"][aria-selected="true"]') ?? null
    toView(active, !settled.current)
    settled.current = true
    // `overflowing` gates toView, so re-run once the row has measured itself.
  }, [value, overflowing, toView, tablistRef])

  // The chosen tab's fill is ONE piece that glides from tab to tab (`.subtabs__thumb`, styles/core.css + motion.css) instead of each tab painting its own: measured from the
  // chosen tab, re-measured when the row or a tab changes size (a label that grows, the text-size setting). Until it is measured — or when the tab has no box — the tab paints
  // its own fill, so the choice is never invisible. It is only moved after its first paint, so it never slides in from nowhere.
  const [thumb, setThumb] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [thumbReady, setThumbReady] = useState(false)
  useLayoutEffect(() => {
    const list = tablistRef.current
    if (!list) return
    const measure = () => {
      const on = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      if (!on || on.offsetWidth === 0) return setThumb(null)
      const next = { x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight }
      setThumb((t) => (t && t.x === next.x && t.y === next.y && t.w === next.w && t.h === next.h ? t : next))
    }
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(list)
    list.querySelectorAll('[role="tab"]').forEach((tab) => watch.observe(tab))
    return () => watch.disconnect()
  }, [value, options, tablistRef])
  useEffect(() => {
    if (!thumb || thumbReady) return
    const frame = requestAnimationFrame(() => setThumbReady(true))
    return () => cancelAnimationFrame(frame)
  }, [thumb, thumbReady])

  // WAI-ARIA tablist keyboard nav: the tablist is ONE tab stop (roving tabindex — only the
  // selected tab is tabbable), and ←/→/Home/End move + select (automatic activation, fine
  // here — the panels are cheap in-page switches).
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const idx = options.findIndex((o) => o.key === value)
    if (idx < 0) return
    let next = idx
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % options.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + options.length) % options.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = options.length - 1
    else return
    e.preventDefault()
    if (next !== idx) onSelect(options[next].key)
    // preventScroll + toView: a bare .focus() would scroll the whole PAGE to the row.
    const target = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]
    target?.focus({ preventScroll: true })
    hs.toView(target ?? null)
  }

  // Redundant with the tablist's own ←/→ keys, so they take no tab stop — they exist purely
  // to give a mouse a target. Disabled (not hidden) at an end, so the row does not jump as
  // you page along it.
  const showArrows = arrows ?? size !== 'mini'
  const arrow = (dir: -1 | 1) =>
    hs.overflowing && showArrows ? (
      <button
        type="button"
        className="subtabs-row__arrow"
        tabIndex={-1}
        disabled={dir < 0 ? hs.atStart : hs.atEnd}
        aria-label={dir < 0 ? t.subtabs.prev : t.subtabs.next}
        onClick={() => hs.page(dir)}
      >
        <Icon name={dir < 0 ? 'caret-left-bold' : 'caret-right-bold'} size={14} />
      </button>
    ) : null

  return (
    <div className="subtabs-row">
      {arrow(-1)}
      <div ref={tablistRef} className={group} role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown} data-thumb={thumb ? '' : undefined}>
        {thumb && <span className={'subtabs__thumb' + (thumbReady ? ' is-ready' : '')} aria-hidden="true" style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)`, width: thumb.w, height: thumb.h }} />}
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={value === o.key}
            tabIndex={value === o.key ? 0 : -1}
            className={'subtabs__opt' + (value === o.key ? ' is-on' : '') + (o.who === undefined ? '' : ` who--${o.who}`) + (o.tone === undefined ? '' : ` tone--${o.tone}`)}
            aria-label={o.ariaLabel}
            title={o.ariaLabel}
            onClick={() => onSelect(o.key)}
          >
            {o.who !== undefined && <span className="who-dot" aria-hidden="true" />}
            {o.tone !== undefined && <span className="tone__dot" aria-hidden="true" />}
            {o.concept && <ConceptPip id={o.concept} size="sm" />}
            {o.icon && <InlineIcon name={o.icon} size={15} />}
            {o.label}
          </button>
        ))}
      </div>
      {arrow(1)}
      {trailing}
    </div>
  )
}

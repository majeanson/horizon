import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { InlineIcon, type IconName } from './Icon'

// The ONE chip — the small mono pill used for filters, toggles, day-pickers and
// tags across the app. Wraps the existing `.chip` / `.chip.is-on` look so the
// dozens of hand-rolled `<button className="chip">` collapse to one component.
//
// FOUR shapes, and WHICH ONE you get is decided by the props, because they are
// four different things to a screen reader (2026-09-08 — before this, a chip was
// either a toggle or a static label, and everything else stayed hand-rolled
// around the primitive; the audit found 10 `<Chip onClick>` ACTION chips being
// announced as unpressed toggle buttons, plus 17 hand-rolled `.chip` sites that
// had opted out of the primitive precisely because it could not say what they
// were):
//
//   • **toggle**  — pass `selected` (with `onClick`). `aria-pressed` reflects it.
//     A filter, a day pick, a on/off tag. `selected` is what MAKES it a toggle:
//     it is emitted only when the prop is present, never as a bare `false`.
//   • **action**  — `onClick` with NO `selected`. A real button that DOES
//     something (fills a field with a preset, plans a day, clears a draft). It
//     carries no `aria-pressed`, because it holds no state to press.
//   • **link**    — `to`. Navigates; renders an `<a>` (« La galerie de dessins »).
//   • **static**  — neither. A label/tag. `disabled` marks it `aria-disabled`
//     (the read-only face of a chip that IS a control for an operator — a guest's
//     inert « quand » badge, an idea row nobody may plan).
//
// A toggle that belongs to a CHOOSE-ONE set (a strategy card's name chip: picking one replaces the others, tapping the
// picked one again does nothing) passes `radio`: it then says `role="radio"` + `aria-checked` instead of `aria-pressed`,
// because a button announced as « pressed » promises a second press that un-presses it.
//
// `expanded` is the fifth, narrower shape: an action chip that OPENS something
// in place (the meal-idea rows, which unfold a MealPlanPicker under themselves).
// It says `aria-expanded`, never `aria-pressed` — a disclosure is not a toggle.
//
// `current` is the sixth: the « you are here » chip of a nav (SectionNav's marked
// section). It wears the `.is-on` look and says `aria-current`, never pressed —
// a location is not a toggle, and « pressed » promised an un-press that meant nothing.
//
// `onRemove` is the removable tag-pill: the chip is itself the remove button and
// grows a trailing ✕ (it is an action, so no `aria-pressed` there either).
export function Chip({
  children,
  selected,
  radio,
  onClick,
  onRemove,
  removeLabel,
  to,
  expanded,
  current,
  icon,
  ariaLabel,
  title,
  disabled,
  className,
  style,
}: {
  children: ReactNode
  /** Present = this chip is a TOGGLE, and this is its state. Omit for an action. */
  selected?: boolean
  /** With `selected`: one of a choose-one set — announced as a radio, not as a pressed button. */
  radio?: boolean
  /** The event is passed through for the rare row-nested chip that must stop it. */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  onRemove?: () => void
  removeLabel?: string
  /** A chip that NAVIGATES — renders a react-router `<Link>`. */
  to?: string
  /** A chip that UNFOLDS a panel under itself — `aria-expanded`, not pressed. */
  expanded?: boolean
  /** The « you are here » of a nav — `aria-current` + the is-on look, not pressed. */
  current?: boolean
  icon?: IconName
  ariaLabel?: string
  title?: string
  /** Interactive: disables the button. Static: marks the label `aria-disabled`. */
  disabled?: boolean
  /** Extra modifier class(es) appended after `chip`/`is-on` (e.g. `kitchen__pill`,
   *  `tag-admin__pill`) — for the chips that carry a layout/scope variant. */
  className?: string
  /** Inline style — the colour-tinted tag pills (`chipTint(...)`) need this. */
  style?: CSSProperties
}) {
  // A removable chip is itself the remove button (tap the pill to drop it) — the
  // pattern the recipe tag-pills use. Otherwise it's a toggle, an action, a link
  // or a static label.
  const handler = onRemove ?? onClick
  const cls = 'chip' + (selected || current ? ' is-on' : '') + (className ? ` ${className}` : '')
  // A chosen TOGGLE or RADIO says so with a check before its name, and a DISCLOSURE with a caret that turns: a filled
  // pill alone was the same pill as the others to most eyes (the review's « I cannot tell a toggle from a link »). The
  // glyphs are aria-hidden: the state is already in aria-pressed / aria-checked / aria-expanded.
  const lead = expanded !== undefined ? (expanded ? 'caret-up-bold' : 'caret-down-bold') : selected && current === undefined && !onRemove ? 'check-bold' : icon
  // No space character beside the glyph: the chip's own `gap` spaces it, and a space here was a stray character at the
  // head of the chip's text (« Neutre 2,1 % » read as "  Neutre…" to a test matching the start of the name).
  const body = (
    <>
      {lead && <InlineIcon name={lead} />}
      {children}
      {onRemove && <InlineIcon name="x-bold" size={12} />}
    </>
  )

  if (to) {
    return (
      <Link className={cls} style={style} to={to} title={title} aria-label={ariaLabel}>
        {body}
      </Link>
    )
  }

  if (!handler) {
    return (
      <span className={cls} title={title} style={style} aria-disabled={disabled || undefined}>
        {body}
      </span>
    )
  }
  return (
    <button
      type="button"
      className={cls}
      style={style}
      onClick={handler}
      // Only a TOGGLE says pressed. An action chip that announced
      // `aria-pressed="false"` for ever ("Balayer, toggle button, not pressed")
      // was the bug this shape split fixes. A chip that says `expanded` is a
      // disclosure, never ALSO a pressed toggle — `selected` may still ride
      // along for the `.is-on` look of an opened rule.
      role={radio && selected !== undefined && !onRemove ? 'radio' : undefined}
      aria-checked={radio && selected !== undefined && !onRemove ? selected : undefined}
      aria-pressed={selected === undefined || onRemove || radio || expanded !== undefined || current !== undefined ? undefined : selected}
      aria-expanded={expanded}
      aria-current={current || undefined}
      aria-label={ariaLabel ?? (onRemove ? removeLabel : undefined)}
      title={title}
      disabled={disabled}
    >
      {body}
    </button>
  )
}

// A labelled row of chips — the `.picker-chips` pattern (a quiet label then a
// wrapped run of chips). `label` is optional; omit it for a bare chip row.
export function ChipGroup({ label, children }: { label?: ReactNode; children: ReactNode }) {
  return (
    <div className="chip-group">
      {label != null && <span className="chip-group__label">{label}</span>}
      <div className="chip-group__chips">{children}</div>
    </div>
  )
}

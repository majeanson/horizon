import { useState, type ReactNode } from 'react'
import { Icon } from './Icon'

// A calm, collapsed-by-default expand/toggle. A single summary row (caret + label + optional
// count) reveals its children only when tapped, so a secondary, space-hungry group — the
// per-year table, the list of parameters behind a figure — never fills the surface unasked.
// `aria-expanded` keeps it accessible; the caret rotates via CSS off `.disclosure--open`.
export function Disclosure({
  label,
  count,
  defaultOpen = false,
  className,
  children,
}: {
  label: string
  // Shown as a small badge on the summary so the count stays visible while collapsed.
  count?: number
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={'disclosure' + (open ? ' disclosure--open' : '') + (className ? ' ' + className : '')}>
      <button type="button" className="disclosure__summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="disclosure__caret" aria-hidden="true">
          <Icon name="caret-down-bold" size={14} />
        </span>
        <span className="disclosure__label mono">{label}</span>
        {count != null && count > 0 ? <span className="disclosure__count mono">{count}</span> : null}
      </button>
      {open && <div className="disclosure__body">{children}</div>}
    </div>
  )
}

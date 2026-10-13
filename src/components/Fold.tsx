import type { ReactNode } from 'react'

// Fold — the ONE « one tap away, never in the way » disclosure: a quiet summary line, and under it the explanation that a reader who knows what
// they are looking at never needs. A native <details>: keyboard, screen reader and find-in-page already work, and it needs no state of ours.
// Use it for what a view MEANS (a measure's definition, what a full bar stands for, why an assumption matters, what a mark under a card is). Never for
// the sentence that says what the view answers, never for what is needed to ACT, and never for what is needed to READ a figure correctly: its unit
// (« en k ou en M »), whose numbers they are, what a column counts. Those stay on the page, a phone's included (strategies.spec pins one).
//
// Two more uses, both from giving a long page ONE level instead of a switch inside a switch: a CONTROLLED fold (`open` + `onToggle`) whose state the
// page keeps in the address, so a link can open it; and `mountOnOpen`, which renders the body only while it is open — a tool that runs a projection
// (a what-if, a heavy table) costs nothing until someone asks for it.
export function Fold({
  summary,
  children,
  className,
  id,
  open,
  onToggle,
  mountOnOpen,
}: {
  summary: ReactNode
  children: ReactNode
  className?: string
  id?: string
  /** Controlled: the page decides. Leave out for the native, self-keeping disclosure. */
  open?: boolean
  onToggle?: (open: boolean) => void
  mountOnOpen?: boolean
}) {
  const controlled = open !== undefined
  return (
    <details
      id={id}
      className={'fold' + (className ? ` ${className}` : '')}
      open={controlled ? open : undefined}
      onToggle={onToggle ? (e) => { if (e.currentTarget.open !== open) onToggle(e.currentTarget.open) } : undefined}
    >
      <summary>{summary}</summary>
      <div className="fold__body">{mountOnOpen && controlled && !open ? null : children}</div>
    </details>
  )
}

import type { ReactNode } from 'react'
import type { ConceptId } from '../lib/concepts'
import { ConceptPip } from './ConceptPip'

// Fold — the ONE « one tap away, never in the way » disclosure: a quiet summary line, and under it the explanation that a reader who knows what
// they are looking at never needs. A native <details>: keyboard, screen reader and find-in-page already work, and it needs no state of ours.
// Use it for what a view MEANS (a measure's definition, what a full bar stands for, why an assumption matters, what a mark under a card is). Never for
// the sentence that says what the view answers, never for what is needed to ACT, and never for what is needed to READ a figure correctly: its unit
// (« en k ou en M »), whose numbers they are, what a column counts. Those stay on the page, a phone's included (strategies.spec pins one).
//
// Two more uses, both from giving a long page ONE level instead of a switch inside a switch: a CONTROLLED fold (`open` + `onToggle`) whose state the
// page keeps in the address, so a link can open it; and `mountOnOpen`, which renders the body only while it is open — a tool that runs a projection
// (a what-if, a heavy table) costs nothing until someone asks for it.
//
// `concept` makes the fold a CARD (a bordered surface, its summary a title led by the concept's pip): a tool the reader opens on purpose — the markets drawn five ways, the calendar, the two start
// ages tried together — rather than an explanation under a figure. The behaviour is the same disclosure.
export function Fold({
  summary,
  children,
  className,
  id,
  open,
  onToggle,
  mountOnOpen,
  concept,
}: {
  summary: ReactNode
  children: ReactNode
  className?: string
  id?: string
  /** Controlled: the page decides. Leave out for the native, self-keeping disclosure. */
  open?: boolean
  onToggle?: (open: boolean) => void
  /** Render the body only while open — CONTROLLED folds only (`open` given): an uncontrolled fold always renders it, hidden. */
  mountOnOpen?: boolean
  /** A card, led by this concept's pip. */
  concept?: ConceptId
}) {
  const controlled = open !== undefined
  return (
    <details
      id={id}
      className={'fold' + (concept ? ' fold--card' : '') + (className ? ` ${className}` : '')}
      open={controlled ? open : undefined}
      onToggle={onToggle ? (e) => { if (e.currentTarget.open !== open) onToggle(e.currentTarget.open) } : undefined}
    >
      <summary>{concept ? <span className="fold__title"><ConceptPip id={concept} size="sm" /><span>{summary}</span></span> : summary}</summary>
      <div className="fold__body">{mountOnOpen && controlled && !open ? null : children}</div>
    </details>
  )
}

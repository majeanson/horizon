import type { ReactNode } from 'react'

// Fold — the ONE « one tap away, never in the way » disclosure: a quiet summary line, and under it the explanation that a reader who knows what
// they are looking at never needs. A native <details>: keyboard, screen reader and find-in-page already work, and it needs no state of ours.
// Use it for what a view MEANS (a measure's definition, what a full bar stands for, why an assumption matters, what a mark under a card is). Never for
// the sentence that says what the view answers, never for what is needed to ACT, and never for what is needed to READ a figure correctly: its unit
// (« en k ou en M »), whose numbers they are, what a column counts. Those stay on the page, a phone's included (strategies.spec pins one).
export function Fold({ summary, children, className }: { summary: ReactNode; children: ReactNode; className?: string }) {
  return (
    <details className={'fold' + (className ? ` ${className}` : '')}>
      <summary>{summary}</summary>
      <div className="fold__body">{children}</div>
    </details>
  )
}

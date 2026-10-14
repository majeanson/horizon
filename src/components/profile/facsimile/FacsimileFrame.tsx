import type { ReactNode } from 'react'

// The paper under a facsimile (the `.facsimile` family in styles/revamp.css): the hint above it, the surface that lays the boxes out like the document, and
// a frame line saying this is the document's LAYOUT, never the document — no logo, no branding, nothing that could pass for the real page. Profile-specific
// (not a shared primitive): the two facsimiles of « Par document » are its only users.

export function FacsimileFrame({ hint, frame, label, children }: { hint: string; frame: string; label: string; children: ReactNode }) {
  return (
    <div className="facsimile-wrap">
      <p className="field-row__hint">{hint}</p>
      <div className="facsimile" role="group" aria-label={label}>
        {children}
        <p className="facsimile__frame">{frame}</p>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'

// The top of every page: ONE <h1> and a quiet line under it. (A SectionHeader names a section INSIDE a page;
// the page itself is named here, so each route has exactly one level-one heading.)
export function PageHead({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <header className="page-head">
      <h1 className="page-head__title">{title}</h1>
      {subtitle != null && <p className="page-head__sub">{subtitle}</p>}
    </header>
  )
}

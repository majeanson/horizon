import { useEffect, type ReactNode } from 'react'
import { useT } from '../i18n'

// The top of every page: ONE <h1> and a quiet line under it. (A SectionHeader names a section INSIDE a page;
// the page itself is named here, so each route has exactly one level-one heading.)
//
// It also names the TAB: « Résultats · Horizon ». A single-page app that keeps one title for every route tells a
// screen-reader user, a bookmark and the browser history that they are always in the same place (WCAG 2.4.2).
export function PageHead({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  const t = useT()
  useEffect(() => {
    document.title = `${title} · ${t.appName}`
  }, [title, t.appName])
  return (
    <header className="page-head">
      <h1 className="page-head__title">{title}</h1>
      {subtitle != null && <p className="page-head__sub">{subtitle}</p>}
    </header>
  )
}

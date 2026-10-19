import { useEffect, type ReactNode } from 'react'
import { useT } from '../i18n'

// The top of every page: ONE <h1> and a quiet line under it. (A SectionHeader names a section INSIDE a page;
// the page itself is named here, so each route has exactly one level-one heading.)
//
// It also names the TAB: « Résultats · Horizon ». A single-page app that keeps one title for every route tells a
// screen-reader user, a bookmark and the browser history that they are always in the same place (WCAG 2.4.2).
//
// `specimen`: the component gallery's copy (pages/DevKit.tsx) — the same look, but an <h2> and the tab's title left alone, so the gallery keeps
// its own one <h1> and its own name.
export function PageHead({ title, subtitle, specimen = false }: { title: string; subtitle?: ReactNode; specimen?: boolean }) {
  const t = useT()
  useEffect(() => {
    if (!specimen) document.title = `${title} · ${t.appName}`
  }, [title, t.appName, specimen])
  const Heading = specimen ? 'h2' : 'h1'
  return (
    <header className="page-head">
      <Heading className="page-head__title">{title}</Heading>
      {subtitle != null && <p className="page-head__sub">{subtitle}</p>}
    </header>
  )
}

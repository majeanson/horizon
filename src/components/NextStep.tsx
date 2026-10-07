import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// « What now? » — the end of a page names the ONE next thing to do, as a single primary action, with a line that says
// what is missing (or that nothing is). The order a person works in is Profil → Hypothèses → Résultats; this is how
// every page hands over to the next, so nobody has to guess where to go.
export function NextStep({ to, label, children }: { to: string; label: string; children?: ReactNode }) {
  return (
    <div className="next surface">
      {children != null && <div className="next__hint">{children}</div>}
      <Link className="btn next__go" to={to}>
        {label}
      </Link>
    </div>
  )
}

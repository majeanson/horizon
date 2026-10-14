import { Link } from 'react-router-dom'
import { useLang } from '../i18n'
import { factsOf } from '../lib/facts'
import { RESULTS_COPY } from '../lib/resultsCopy'
import { useProfile } from '../lib/store'

// « Estimé » beside a figure that is restated OUTSIDE the Profil (the ledger, the printed plan): the figure is still an estimate, and this says so where it is
// read, with the way to the field that confirms it. It renders NOTHING once the fact is confirmed, or when the household has no such fact. READ-ONLY — a plain
// link; the toggle beside the field on Profil (FactToggle) stays the only place a figure becomes confirmed.
export function EstFlag({ fact }: { fact: string }) {
  const c = RESULTS_COPY[useLang().lang].est
  const profile = useProfile()
  const f = factsOf(profile).find((x) => x.id === fact)
  if (f === undefined || f.confirmed) return null
  return (
    <Link className="est" to={`/profil?fact=${encodeURIComponent(fact)}`} aria-label={c.label}>
      {c.mark}
    </Link>
  )
}

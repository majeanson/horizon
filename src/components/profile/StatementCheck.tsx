import { useLang } from '../../i18n'
import type { Person } from '../../engine/types'
import { formatPct } from '../../lib/format'
import { formatMoney } from '../../lib/money'
import { statementLine } from '../../lib/statementCheck'
import { STATEMENT_CHECK_COPY } from '../../lib/statementCheckCopy'
import { today } from '../../lib/today'

// The relevé's « Montant actuel » the person typed, beside what the calculation gives for the same history: the same figure, or by how much it differs and what to
// look at. Shown under the two figures, only for one that is typed; it never changes a figure. Used by the form and by the document facsimile (the same two fields).
export function StatementCheck({ person }: { person: Person }) {
  const { lang } = useLang()
  const c = STATEMENT_CHECK_COPY[lang]
  const year = today().year
  const lines = ([60, 65] as const).flatMap((at) => statementLine(person, at, year) ?? [])
  if (lines.length === 0) return null
  return (
    <div className="statement-check" role="status">
      {lines.map((l) => {
        const engine = formatMoney(l.engine, lang)
        const diff = formatMoney(Math.abs(l.diff), lang)
        const share = formatPct(l.share, lang, 0)
        return (
          <p key={l.at} className="field-row__hint">
            <strong>{l.at}</strong> — {l.same ? c.same(engine) : l.diff > 0 ? c.higher(engine, diff, share) : c.lower(engine, diff, share)}
          </p>
        )
      })}
      <p className="field-row__hint">{c.method}</p>
      {lines.some((l) => !l.same) && <p className="field-row__hint">{c.check}</p>}
    </div>
  )
}

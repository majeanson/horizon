import { useMemo } from 'react'
import { useLang } from '../../../i18n'
import { historyYears } from '../../../lib/earnings'
import { FACSIMILE_COPY } from '../../../lib/facsimileCopy'
import { setStatement } from '../../../lib/profileEdit'
import { today } from '../../../lib/today'
import { NumberField } from '../../NumberField'
import { PasteEarnings } from '../PasteEarnings'
import { StatementCheck } from '../StatementCheck'
import type { PersonEditor } from '../shared'
import { FacsimileFrame } from './FacsimileFrame'

// The relevé de participation's « Estimation des prestations ▸ Rente de retraite » table, as the reader holds it: rows « 60 ans » and « 65 ans », columns
// « Montant actuel » and « Montant projeté », no unit printed. The words are the document's own (lib/facsimileCopy.ts). The same fields as the form
// (RrqSection's « Estimation du relevé »): nothing is stored here.
//
// THE CONTRACT OF THESE BOXES (engine/types.ts): « Montant actuel » is the relevé's own estimate, kept as a CHECK against the engine, NEVER as an input —
// so typing it confirms no fact (there is no FactKind for it) and the projection never reads it. « Montant projeté » is drawn but disabled: its estimate
// counts only the first enhancement of the plan, so it is not comparable with the engine's.

export function RrqFacsimile({ person, edit }: PersonEditor) {
  const { lang } = useLang()
  const c = FACSIMILE_COPY[lang]
  const q = c.quotes.rrq
  const now = today()
  const years = useMemo(() => historyYears(person, now.year - 1), [person, now.year])
  const rows = [
    { at: 60 as const, label: q.age60, value: person.rrq.statementAt60 ?? null },
    { at: 65 as const, label: q.age65, value: person.rrq.statementAt65 ?? null },
  ]
  return (
    <FacsimileFrame hint={c.rrq.hint} frame={c.rrq.frame} label={c.rrq.tableLabel}>
      <p className="facsimile__screen" lang="fr">
        {q.section}
      </p>
      <table className="facsimile__table" lang="fr">
        <caption className="facsimile__caption">{q.table}</caption>
        <thead>
          <tr>
            <td />
            <th scope="col">{q.current}</th>
            <th scope="col">{q.projected}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.at}>
              <th scope="row">{r.label}</th>
              <td>
                <NumberField
                  kind="money"
                  allowEmpty
                  max={1e5}
                  unit=""
                  value={r.value}
                  onChange={(v) => edit((x) => setStatement(x, r.at, v))}
                  ariaLabel={`${q.current}, ${r.label}`}
                />
              </td>
              <td>
                <NumberField kind="money" allowEmpty max={1e5} unit="" disabled value={null} onChange={() => undefined} ariaLabel={`${q.projected}, ${r.label}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="facsimile__note">{c.rrq.projectedWhy}</p>
      <StatementCheck person={person} />
      <div className="earnings__paste-wrap">
        <PasteEarnings person={person} edit={edit} years={years} />
      </div>
    </FacsimileFrame>
  )
}

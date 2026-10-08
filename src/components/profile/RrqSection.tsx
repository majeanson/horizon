import { useMemo, useState } from 'react'
import { makeRrqRules } from '../../engine/rrqRules'
import { useLang, useT } from '../../i18n'
import { fillFromSalary, historyYears } from '../../lib/earnings'
import { formatYearAge } from '../../lib/format'
import { setEarning } from '../../lib/profileEdit'
import { useProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { Chip } from '../Chip'
import { FieldInfo } from '../FieldInfo'
import { FieldRow } from '../FieldRow'
import { NumberField } from '../NumberField'
import { SectionHeader } from '../SectionHeader'
import { StatusMessage } from '../StatusMessage'
import { Section, type PersonEditor } from './shared'

// The RRQ: when the pension starts, and the pensionable earnings the relevé lists year by year.

export function RrqSection({ person, edit }: PersonEditor) {
  const t = useT()
  const { lang } = useLang()
  const r = t.profile.rrq
  const { assumptions } = useProfile()
  const now = today()
  const rules = useMemo(() => makeRrqRules({ inflation: assumptions.inflation, wageGrowth: assumptions.wageGrowth }), [assumptions.inflation, assumptions.wageGrowth])
  const years = useMemo(() => historyYears(person, now.year - 1), [person, now.year])
  const typed = Object.keys(person.earningsHistory).length
  // The note under the fill action and, while nothing else has been touched since, the way back:
  // one tap writes ~30 estimated years that are indistinguishable from typed ones afterward, so the
  // state keeps the history as it was. A manual cell edit clears the offer (undoing would eat it).
  const [filledNote, setFilledNote] = useState<{ note: string; before: Record<number, number> | null } | null>(null)

  const fill = () => {
    const filled = fillFromSalary(person, now, assumptions.wageGrowth, rules.mga)
    const added = Object.keys(filled).length - typed
    setFilledNote(added > 0 ? { note: r.filled(added), before: person.earningsHistory } : { note: r.nothingToFill, before: null })
    if (added > 0) edit((x) => ({ ...x, earningsHistory: filled }))
  }
  const unfill = () => {
    const before = filledNote?.before
    if (before == null) return
    edit((x) => ({ ...x, earningsHistory: before }))
    setFilledNote(null)
  }

  return (
    <Section title={r.title} icon="calendar-blank-bold">
      <FieldRow label={r.startAge} infoId="rrqStartAge" hint={r.startHint}>
        {(w) => (
          <NumberField kind="int" min={60} max={72} unit={t.fields.years} value={person.rrq.startAge} onChange={(startAge) => edit((x) => ({ ...x, rrq: { ...x.rrq, startAge } }))} id={w.id} ariaDescribedBy={w.describedBy} />
        )}
      </FieldRow>

        <div className="earnings">
          <SectionHeader title={r.earnings} subtitle={r.earningsCount(typed, years.length)} />
          <p className="field-row__hint">{r.earningsHint}</p>
          <div className="earnings__tools">
            <FieldInfo id="earnings" label={r.earnings} />
            <Chip onClick={fill}>{r.fill}</Chip>
          </div>
          <p className="field-row__hint">{r.fillHint}</p>
          {filledNote && (
            <div className="earnings__filled">
              <StatusMessage tone="info">{filledNote.note}</StatusMessage>
              {filledNote.before !== null && <Chip onClick={unfill}>{r.fillUndo}</Chip>}
            </div>
          )}
          {/* One line per year, oldest first, like the relevé: the year (with the age it falls at) on the left, the amount on the right. */}
          <div className="earnings__head" aria-hidden="true">
            <span>{r.colYear}</span>
            <span>{r.colAmount}</span>
          </div>
          <ul className="earnings__list">
            {years.map((year) => (
              <li key={year} className="earnings__row">
                <span className="earnings__year mono" aria-hidden="true">{formatYearAge(year, [person.birth.year], lang)}</span>
                <NumberField
                  kind="money"
                  allowEmpty
                  max={1e9}
                  value={person.earningsHistory[year] ?? null}
                  onChange={(v) => {
                    setFilledNote(null)
                    edit((x) => setEarning(x, year, v))
                  }}
                  ariaLabel={r.earningsYear(year)}
                />
              </li>
            ))}
          </ul>
        </div>

    </Section>
  )
}


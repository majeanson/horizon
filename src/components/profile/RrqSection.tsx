import { useMemo, useState } from 'react'
import { makeRrqRules } from '../../engine/rrqRules'
import { useLang, useT } from '../../i18n'
import { fillFromSalary, historyYears, rrqEstimate } from '../../lib/earnings'
import { formatPct } from '../../lib/format'
import { formatMoney } from '../../lib/money'
import { setEarning } from '../../lib/profileEdit'
import { useProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { Advanced } from '../Advanced'
import { Chip } from '../Chip'
import { Disclosure } from '../Disclosure'
import { FieldInfo } from '../FieldInfo'
import { FieldRow } from '../FieldRow'
import { NumberField } from '../NumberField'
import { StatusMessage } from '../StatusMessage'
import { Section, type PersonEditor } from './shared'

// The RRQ: when the pension starts, the pensionable earnings the relevé lists year by year, and — the
// counter-check this app is built around — Horizon's own figure set beside the one printed on the relevé.

const SAME_WITHIN = 0.01 // a difference under 1 % reads as « the same »

export function RrqSection({ person, edit }: PersonEditor) {
  const t = useT()
  const { lang } = useLang()
  const r = t.profile.rrq
  const { assumptions } = useProfile()
  const now = today()
  const rules = useMemo(() => makeRrqRules({ inflation: assumptions.inflation, wageGrowth: assumptions.wageGrowth }), [assumptions.inflation, assumptions.wageGrowth])
  const years = useMemo(() => historyYears(person, now.year - 1), [person, now.year])
  const typed = Object.keys(person.earningsHistory).length
  const [filledNote, setFilledNote] = useState<string | null>(null)

  const fill = () => {
    const filled = fillFromSalary(person, now, assumptions.wageGrowth, rules.mga)
    const added = Object.keys(filled).length - typed
    setFilledNote(added > 0 ? r.filled(added) : r.nothingToFill)
    if (added > 0) edit((x) => ({ ...x, earningsHistory: filled }))
  }

  const canCheck = typed > 0 || person.salaryToday > 0
  const checks = ([65, 60] as const).flatMap((age) => {
    const stated = age === 65 ? person.rrq.statementAt65 : person.rrq.statementAt60
    if (!canCheck || stated === undefined) return []
    const own = rrqEstimate(person, now, age, rules)
    const diff = own - stated
    const pct = stated > 0 ? diff / stated : 0
    return [{ age, own, stated, diff, pct }]
  })

  return (
    <Section title={r.title} icon="calendar-blank-bold">
      <FieldRow label={r.startAge} infoId="rrqStartAge" hint={r.startHint}>
        {(w) => (
          <NumberField kind="int" min={60} max={72} unit={t.fields.years} value={person.rrq.startAge} onChange={(startAge) => edit((x) => ({ ...x, rrq: { ...x.rrq, startAge } }))} id={w.id} ariaDescribedBy={w.describedBy} />
        )}
      </FieldRow>

      <Advanced>
      <Disclosure label={r.earnings} count={typed}>
        <div className="earnings">
          <p className="field-row__hint">{r.earningsCount(typed)}. {r.earningsHint}</p>
          <div className="earnings__tools">
            <FieldInfo id="earnings" label={r.earnings} />
            <Chip onClick={fill}>{r.fill}</Chip>
          </div>
          <p className="field-row__hint">{r.fillHint}</p>
          {filledNote && <StatusMessage tone="info">{filledNote}</StatusMessage>}
          <div className="earnings__grid">
            {years.map((year) => (
              <div key={year} className="earnings__cell">
                <span className="earnings__year mono" aria-hidden="true">{year}</span>
                <NumberField
                  kind="money"
                  allowEmpty
                  max={1e9}
                  value={person.earningsHistory[year] ?? null}
                  onChange={(v) => edit((x) => setEarning(x, year, v))}
                  ariaLabel={r.earningsYear(year)}
                />
              </div>
            ))}
          </div>
        </div>
      </Disclosure>

      <FieldRow label={r.statement65} infoId="rrqEstimate65" hint={r.statementHint}>
        {(w) => (
          <NumberField kind="money" allowEmpty max={100_000} value={person.rrq.statementAt65 ?? null} onChange={(v) => edit((x) => ({ ...x, rrq: withoutUndefined({ ...x.rrq, statementAt65: v ?? undefined }) }))} id={w.id} ariaDescribedBy={w.describedBy} />
        )}
      </FieldRow>
      <FieldRow label={r.statement60} infoId="rrqEstimate60">
        {(w) => (
          <NumberField kind="money" allowEmpty max={100_000} value={person.rrq.statementAt60 ?? null} onChange={(v) => edit((x) => ({ ...x, rrq: withoutUndefined({ ...x.rrq, statementAt60: v ?? undefined }) }))} id={w.id} />
        )}
      </FieldRow>

      {checks.length > 0 && (
        <div className="rrq-check" aria-label={r.checkTitle}>
          {checks.map((c) => (
            <div key={c.age}>
              <p className="rrq-check__line">{r.checkHorizon(c.age, formatMoney(c.own, lang, { cents: true }))}</p>
              {Math.abs(c.pct) <= SAME_WITHIN ? (
                <StatusMessage tone="success">{r.checkSame}</StatusMessage>
              ) : (
                <StatusMessage tone="info">{r.checkDiff(formatMoney(c.diff, lang, { cents: true }), formatPct(c.pct, lang, 1))}</StatusMessage>
              )}
            </div>
          ))}
          <p className="field-row__hint">{r.checkNote}</p>
        </div>
      )}
      </Advanced>
    </Section>
  )
}

// A cleared optional figure is removed from the object, so a saved profile never carries `undefined` keys.
function withoutUndefined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T
}

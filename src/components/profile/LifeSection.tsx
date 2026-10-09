import { useLang, useT } from '../../i18n'
import type { Flow, PersonId } from '../../engine/types'
import { useConfirm } from '../../lib/confirm'
import { formatYearAge } from '../../lib/format'
import { LIFE_COPY, type FlowKindName } from '../../lib/lifeCopy'
import { formatMoney } from '../../lib/money'
import { addFlow, removeFlow, updateFlow } from '../../lib/profileEdit'
import { MAX_FLOWS } from '../../lib/schema'
import { updateProfile, useProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { Chip } from '../Chip'
import { EditField } from '../EditField'
import { FieldRow } from '../FieldRow'
import { Cluster } from '../Layout'
import { NumberField } from '../NumberField'
import { Section } from './shared'

// « Événements et revenus datés » — what is not in the regular budget and has its own years: an inheritance, a roof, a car, rent received,
// a care reserve. Three kinds (money received once · an expense · an income); each says when it starts, whether it lasts, and — for an
// income — whose it is and whether it is taxed. The plan reads them through engine/lifeEvents.ts: an expense joins the need of its years,
// a windfall lands in the non-registered account, an income is taxed as ordinary income when it says so. They sit in the HOUSEHOLD, above
// the two people's columns: a roof is the household's.

const KINDS: readonly FlowKindName[] = ['windfall', 'expense', 'income']

export function LifeSection() {
  const t = useT()
  const { lang } = useLang()
  const c = LIFE_COPY[lang].flows
  const profile = useProfile()
  const confirm = useConfirm()
  const flows = profile.household.flows ?? []
  const persons = profile.household.persons
  const couple = persons.length === 2
  const births = persons.map((p) => p.birth.year)
  const now = today().year
  const horizon = profile.assumptions.horizonAge
  const oldestBirth = Math.min(...births)

  // A starting point for each kind of event: sensible, editable, never a promise.
  const starters: { key: keyof typeof c.starters; flow: Flow }[] = [
    { key: 'heritage', flow: { label: c.starters.heritage, kind: 'windfall', amount: 100000, fromYear: now + 10, toYear: now + 10, owner: 'self', taxable: false } },
    { key: 'roof', flow: { label: c.starters.roof, kind: 'expense', amount: 25000, fromYear: now + 3, toYear: now + 3, owner: 'self', taxable: false } },
    { key: 'car', flow: { label: c.starters.car, kind: 'expense', amount: 35000, fromYear: now + 2, toYear: now + 2, owner: 'self', taxable: false } },
    { key: 'rent', flow: { label: c.starters.rent, kind: 'income', amount: 12000, fromYear: now + 5, toYear: oldestBirth + horizon, owner: 'self', taxable: true } },
    { key: 'care', flow: { label: c.starters.care, kind: 'expense', amount: 30000, fromYear: oldestBirth + 85, toYear: oldestBirth + horizon, owner: 'self', taxable: false } },
  ]
  const at = (year: number) => formatYearAge(year, births, lang)
  const full = flows.length >= MAX_FLOWS
  const ownerName = (id: PersonId) => persons.find((p) => p.id === id)?.name.trim() || (id === 'self' ? t.profile.self : t.profile.spouse)

  return (
    <Section id="evenements" title={c.title} subtitle={c.hint} icon="calendar-blank-bold">
      {flows.length === 0 && <p className="field-row__hint">{c.empty}</p>}
      {flows.length > 0 && (
        <ul className="flows">
          {flows.map((f, i) => {
            const set = (change: (x: Flow) => Flow) => updateProfile((p) => updateFlow(p, i, change))
            const once = f.toYear === f.fromYear
            return (
              <li key={i} className="flow">
                <p className="flow__line">
                  <strong>{f.label.trim() || c.unnamed}</strong> — {c.line(f.kind, formatMoney(f.amount, lang), at(f.fromYear), once || f.kind === 'windfall' ? null : at(f.toYear))}
                </p>
                <FieldRow label={c.name}>
                  {(w) => <EditField as="div" value={f.label} onChange={(label) => set((x) => ({ ...x, label }))} submitIcon={null} maxLength={60} id={w.id} ariaLabel={c.name} />}
                </FieldRow>
                <Cluster role="radiogroup" aria-label={c.title}>
                  {KINDS.map((k) => (
                    <Chip key={k} radio selected={f.kind === k} onClick={() => set((x) => ({ ...x, kind: k, taxable: k === 'income' ? x.taxable || x.kind === 'income' : false }))}>
                      {c.kind[k]}
                    </Chip>
                  ))}
                </Cluster>
                <p className="field-row__hint">{c.kindHint[f.kind]}</p>
                <FieldRow label={f.kind === 'windfall' ? c.amountOnce : c.amountYearly} hint={c.amountHint}>
                  {(w) => <NumberField kind="money" max={1e8} value={f.amount} onChange={(amount) => set((x) => ({ ...x, amount }))} id={w.id} ariaDescribedBy={w.describedBy} />}
                </FieldRow>
                <FieldRow label={c.from} hint={at(f.fromYear)}>
                  {(w) => <NumberField kind="year" min={2000} max={2150} value={f.fromYear} onChange={(fromYear) => set((x) => ({ ...x, fromYear, toYear: Math.max(x.toYear, fromYear) }))} id={w.id} ariaDescribedBy={w.describedBy} />}
                </FieldRow>
                {f.kind !== 'windfall' && (
                  <>
                    <Cluster role="radiogroup" aria-label={c.until}>
                      <Chip radio selected={once} onClick={() => set((x) => ({ ...x, toYear: x.fromYear }))}>
                        {c.once}
                      </Chip>
                      <Chip radio selected={!once} onClick={() => set((x) => ({ ...x, toYear: Math.min(2150, x.fromYear + 5) }))}>
                        {c.until}
                      </Chip>
                    </Cluster>
                    {!once && (
                      <FieldRow label={c.to} hint={at(f.toYear)}>
                        {(w) => <NumberField kind="year" min={f.fromYear} max={2150} value={f.toYear} onChange={(toYear) => set((x) => ({ ...x, toYear }))} id={w.id} ariaDescribedBy={w.describedBy} />}
                      </FieldRow>
                    )}
                  </>
                )}
                {f.kind === 'income' && (
                  <>
                    {couple && (
                      <Cluster role="radiogroup" aria-label={c.owner}>
                        {persons.map((p) => (
                          <Chip key={p.id} radio selected={f.owner === p.id} onClick={() => set((x) => ({ ...x, owner: p.id }))}>
                            {ownerName(p.id)}
                          </Chip>
                        ))}
                      </Cluster>
                    )}
                    <Cluster>
                      <Chip selected={f.taxable} onClick={() => set((x) => ({ ...x, taxable: !x.taxable }))}>
                        {c.taxable}
                      </Chip>
                    </Cluster>
                    <p className="field-row__hint">{c.taxableHint}</p>
                  </>
                )}
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={async () => {
                    const name = f.label.trim() || c.unnamed
                    if (await confirm({ message: c.removeConfirm(name), confirmLabel: t.common.remove })) updateProfile((p) => removeFlow(p, i))
                  }}
                >
                  {c.remove(f.label.trim() || c.unnamed)}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {full ? (
        <p className="field-row__hint">{c.full(MAX_FLOWS)}</p>
      ) : (
        <Cluster aria-label={c.add}>
          {starters.map((s) => (
            <Chip key={s.key} onClick={() => updateProfile((p) => addFlow(p, s.flow))}>
              {c.add} · {s.flow.label}
            </Chip>
          ))}
        </Cluster>
      )}
    </Section>
  )
}

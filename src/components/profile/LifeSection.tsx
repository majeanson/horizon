import { useLang, useT } from '../../i18n'
import { CARD_COPY } from '../../lib/cardCopy'
import type { Flow, PersonId } from '../../engine/types'
import { useConfirm } from '../../lib/confirm'
import { formatPct, formatYearAge } from '../../lib/format'
import { LIFE_COPY, type FlowKindName, type LifeCopy } from '../../lib/lifeCopy'
import { formatMoney } from '../../lib/money'
import { STARTER_CONCEPT } from '../../lib/concepts'
import { isStarterId, plannedStarters, type Starter } from '../../lib/plannedExpenses'
import { addFlow, confirmFlow, removeFlow, updateFlow } from '../../lib/profileLife'
import { MAX_FLOWS } from '../../lib/schema'
import { updateProfile, useProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { Chip } from '../Chip'
import { EditField } from '../EditField'
import { FieldRow } from '../FieldRow'
import { Fold } from '../Fold'
import { Icon } from '../Icon'
import { Cluster } from '../Layout'
import { NumberField } from '../NumberField'
import type { Lang } from '../../i18n'
import { Section } from './shared'

// « Événements et revenus datés » — what is not in the regular budget and has its own years: an inheritance, a roof, a car, rent received,
// a care reserve. Three kinds (money received once · an expense · an income); each says when it starts, whether it lasts, and — for an
// income — whose it is and whether it is taxed. The plan reads them through engine/lifeEvents.ts: an expense joins the need of its years,
// a windfall lands in the non-registered account, an income is taxed as ordinary income when it says so. They sit in the HOUSEHOLD, above
// the two people's columns: a roof is the household's.
//
// Each event is added from a STARTING POINT (lib/plannedExpenses.ts): the house's upkeep and a renovation reserve, the cars to replace, an inheritance, a rent,
// care later on, a project of one's own. A figure that came from one is an ESTIMATE — marked as such, with what it rests on and its source — until the person types
// another amount or confirms it (lib/profileLife.ts).

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

  // A starting point for each kind of event: sensible, editable, never a promise. The ones that rest on a statistic or a rule are offered apart, and only while the
  // list has none of them — still an estimate, or typed over and still under its own name: a second one would count the same expense twice. The plain ones may be
  // added as often as the person likes.
  const starters = plannedStarters(profile, now, c.starters)
  const planned = starters.filter((s) => s.basis.kind !== 'placeholder' && !flows.some((f) => f.estimate === s.id || f.label === s.flow.label))
  const plain = starters.filter((s) => s.basis.kind === 'placeholder')
  const add = (s: Starter) => updateProfile((p) => addFlow(p, s.flow))
  const at = (year: number) => formatYearAge(year, births, lang)
  const full = flows.length >= MAX_FLOWS
  const ownerName = (id: PersonId) => persons.find((p) => p.id === id)?.name.trim() || (id === 'self' ? t.profile.self : t.profile.spouse)

  return (
    <Section id="evenements" title={c.title} subtitle={CARD_COPY[lang].events} details={c.hint} concept="evenements">
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
                <FieldRow label={c.name} help="eventName">
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
                <FieldRow label={f.kind === 'windfall' ? c.amountOnce : c.amountYearly} help="eventAmount" hint={c.amountHint}>
                  {(w) => <NumberField kind="money" max={1e8} value={f.amount} onChange={(amount) => set((x) => ({ ...x, amount }))} id={w.id} ariaDescribedBy={w.describedBy} />}
                </FieldRow>
                <FieldRow label={c.from} help="eventFrom" hint={at(f.fromYear)}>
                  {(w) => <NumberField kind="year" min={2000} max={2150} value={f.fromYear} onChange={(fromYear) => set((x) => ({ ...x, fromYear, toYear: Math.max(x.toYear, fromYear) }))} id={w.id} ariaDescribedBy={w.describedBy} />}
                </FieldRow>
                {f.estimate !== undefined && <EstimateNote estimate={f.estimate} starters={starters} copy={c} lang={lang} onConfirm={() => updateProfile((p) => confirmFlow(p, i))} />}
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
                      <FieldRow label={c.to} help="eventTo" hint={at(f.toYear)}>
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
        <>
          {planned.length > 0 && (
            <>
              <p className="field-row__hint">
                <strong>{c.planned.title}</strong> — {c.planned.hint}
              </p>
              <Cluster aria-label={c.planned.title}>
                {planned.map((s) => (
                  <Chip key={s.id} concept={STARTER_CONCEPT[s.id]} onClick={() => add(s)}>
                    {c.add} · {s.flow.label}
                  </Chip>
                ))}
              </Cluster>
              <p className="field-row__hint">{c.planned.doubleCount}</p>
            </>
          )}
          <Cluster aria-label={c.add}>
            {plain.map((s) => (
              <Chip key={s.id} concept={STARTER_CONCEPT[s.id]} onClick={() => add(s)}>
                {c.add} · {s.flow.label}
              </Chip>
            ))}
          </Cluster>
        </>
      )}
    </Section>
  )
}

/** What an estimate says about itself, in words: the sentence for its basis, and the page it was read on (none for a rule or a placeholder). */
function basisSentence(s: Starter, copy: LifeCopy['flows'], lang: Lang): string {
  const b = s.basis
  if (b.kind === 'placeholder') return copy.planned.placeholder
  if (b.kind === 'rule') return copy.planned.renovation(formatPct(b.share, lang, 0), formatMoney(b.homeValue, lang), formatMoney(b.upkeep, lang))
  const who = copy.planned.tenure[b.tenure]
  const figure = formatMoney(b.figure, lang)
  return s.id === 'vehicle' ? copy.planned.vehicle(who, figure) : copy.planned.upkeep(who, figure)
}

/**
 * The mark of a figure that is still an estimate — the word, the way to keep it, and under a fold what it rests on and where it was read. The figure stops being an
 * estimate when the amount above is typed over or this is confirmed (lib/profileLife.ts). A starting point this version does not know (a later one's, in a file
 * written by it) still shows the mark and the way to confirm: it has no basis to tell.
 */
function EstimateNote({ estimate, starters, copy, lang, onConfirm }: { estimate: string; starters: readonly Starter[]; copy: LifeCopy['flows']; lang: Lang; onConfirm: () => void }) {
  const starter = isStarterId(estimate) ? starters.find((s) => s.id === estimate) : undefined
  const source = starter && starter.basis.kind !== 'placeholder' ? starter.basis.source : undefined
  return (
    <div className="flow__estimate">
      <Cluster>
        <span className="est" role="note" aria-label={copy.estimate.label}>
          {copy.estimate.mark}
        </span>
        <Chip onClick={onConfirm}>{copy.estimate.confirm}</Chip>
      </Cluster>
      {starter && (
        <Fold summary={copy.estimate.basisTitle}>
          <p>{basisSentence(starter, copy, lang)}</p>
          {source && (
            <p>
              <strong>{copy.estimate.sourceTitle}</strong>
              {' — '}
              <a className="info-note__link" href={source.url[lang]} target="_blank" rel="noopener noreferrer">
                {source.title[lang]}
                <Icon name="arrow-up-right-bold" size={14} />
              </a>
            </p>
          )}
        </Fold>
      )}
    </div>
  )
}

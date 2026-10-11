import { useLang, useT } from '../../i18n'
import { factId } from '../../lib/facts'
import { BUDGET_COPY } from '../../lib/budgetCopy'
import { formatMoney } from '../../lib/money'
import { setSpending } from '../../lib/profileEdit'
import { setSplitRow, startSplit, stopSplit } from '../../lib/profileLife'
import { updateProfile, useProfile } from '../../lib/store'
import { Chip } from '../Chip'
import { FieldRow } from '../FieldRow'
import { Cluster } from '../Layout'
import { NumberField } from '../NumberField'
import { ChildCosts } from './FamilySection'
import { LevelSlot } from './LevelSlot'
import { Section } from './shared'

// What the household spends: a FACT about it (the bank statements confirm it), not a guess about the future — so it sits
// here with the other facts, not on Hypothèses. It is the household's, not one person's, so it sits above the two columns.
// (The results page's « Et si je dépensais moins ? » slider and the ledger write the same two figures.)
//
// A couple can enter it ONE way or the OTHER: « Ensemble » (one figure) or « Séparé » (the joint account outside the mortgage, and each person's own spending). Either way the plan reads
// the same two totals; the parts are kept (profile.household.spendingSplit) so the screen reopens as it was left.
export function BudgetSection({ withKids = false }: { /** The children’s cost and where it sits (inside this budget or on top of it): asked only of someone who said there are children. */ withKids?: boolean }) {
  const t = useT()
  const { lang } = useLang()
  const b = t.profile.budget
  const c = BUDGET_COPY[lang]
  const { household } = useProfile()
  const couple = household.persons.length > 1
  const split = household.spendingSplit ?? null
  const money = (n: number) => formatMoney(n, lang)
  const nameOf = (i: number, name: string) => name.trim() || (i === 0 ? t.profile.self : t.profile.spouse)

  const together = (
    <>
      <FieldRow label={b.working} infoId="spendingWorking" hint={b.hint} fact={factId('household', 'spendingWorking')}>
        {(w) => <NumberField kind="money" max={1e8} value={household.spending.workingToday} onChange={(workingToday) => updateProfile((p) => setSpending(p, { workingToday }))} id={w.id} ariaDescribedBy={w.describedBy} />}
      </FieldRow>
      <LevelSlot kind="spendingWorking" owner="household" />
      <FieldRow label={b.retired} infoId="spendingRetired" fact={factId('household', 'spendingRetired')}>
        {(w) => <NumberField kind="money" max={1e8} value={household.spending.retiredToday} onChange={(retiredToday) => updateProfile((p) => setSpending(p, { retiredToday }))} id={w.id} />}
      </FieldRow>
      <LevelSlot kind="spendingRetired" owner="household" />
    </>
  )

  const part = (id: 'joint' | 'self' | 'spouse', title: string) => {
    const row = split?.rows.find((r) => r.id === id)
    if (!row) return null
    // The « confirmed » marks belong to the household's two figures: they sit on the joint account's, the biggest part of both.
    const marks = id === 'joint'
    return (
      <fieldset className="account-group" key={id}>
        <legend className="account-group__title mono">{title}</legend>
        <FieldRow label={b.working} infoId={marks ? 'spendingWorking' : undefined} hint={marks ? b.hint : undefined} fact={marks ? factId('household', 'spendingWorking') : undefined}>
          {(w) => <NumberField kind="money" max={1e8} value={row.working} onChange={(working) => updateProfile((p) => setSplitRow(p, id, { working }))} id={w.id} ariaDescribedBy={w.describedBy} />}
        </FieldRow>
        <FieldRow label={b.retired} infoId={marks ? 'spendingRetired' : undefined} fact={marks ? factId('household', 'spendingRetired') : undefined}>
          {(w) => <NumberField kind="money" max={1e8} value={row.retired} onChange={(retired) => updateProfile((p) => setSplitRow(p, id, { retired }))} id={w.id} />}
        </FieldRow>
      </fieldset>
    )
  }

  return (
    <Section id="budget" title={b.title}>
      {couple && (
        <div className="situation__q">
          <p id="budget-how" className="situation__question">
            {c.how}
          </p>
          <Cluster role="radiogroup" aria-labelledby="budget-how">
            <Chip radio selected={split === null} onClick={() => updateProfile(stopSplit)}>
              {c.together}
            </Chip>
            <Chip radio selected={split !== null} onClick={() => updateProfile(startSplit)}>
              {c.separate}
            </Chip>
          </Cluster>
          <p className="field-row__hint">{split === null ? c.togetherHint : c.separateHint}</p>
        </div>
      )}
      {split === null ? (
        together
      ) : (
        <>
          {part('joint', c.joint)}
          {household.persons.map((p, i) => part(p.id, c.personal(nameOf(i, p.name))))}
          <p className="field-row__hint" aria-live="polite">
            {c.total(money(household.spending.workingToday), money(household.spending.retiredToday))}
          </p>
        </>
      )}
      <ChildCosts withKids={withKids} />
    </Section>
  )
}

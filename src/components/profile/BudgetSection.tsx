import { useT } from '../../i18n'
import { factId } from '../../lib/facts'
import { setSpending } from '../../lib/profileEdit'
import { updateProfile, useProfile } from '../../lib/store'
import { FieldRow } from '../FieldRow'
import { NumberField } from '../NumberField'
import { LevelSlot } from './LevelSlot'
import { Section } from './shared'

// What the household spends: a FACT about it (the bank statements confirm it), not a guess about the future — so it sits
// here with the other facts, not on Hypothèses. It is the household's, not one person's, so it sits above the two columns.
// (The results page's « Et si je dépensais moins ? » slider and the ledger write the same two figures.)
export function BudgetSection() {
  const t = useT()
  const b = t.profile.budget
  const { household } = useProfile()
  return (
    <Section id="budget" title={b.title}>
      <FieldRow label={b.working} infoId="spendingWorking" hint={b.hint} fact={factId('household', 'spendingWorking')}>
        {(w) => <NumberField kind="money" max={1e8} value={household.spending.workingToday} onChange={(workingToday) => updateProfile((p) => setSpending(p, { workingToday }))} id={w.id} ariaDescribedBy={w.describedBy} />}
      </FieldRow>
      <LevelSlot kind="spendingWorking" owner="household" />
      <FieldRow label={b.retired} infoId="spendingRetired" fact={factId('household', 'spendingRetired')}>
        {(w) => <NumberField kind="money" max={1e8} value={household.spending.retiredToday} onChange={(retiredToday) => updateProfile((p) => setSpending(p, { retiredToday }))} id={w.id} />}
      </FieldRow>
      <LevelSlot kind="spendingRetired" owner="household" />
    </Section>
  )
}

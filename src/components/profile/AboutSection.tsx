import { useT } from '../../i18n'
import { factId } from '../../lib/facts'
import { EditField } from '../EditField'
import { FieldRow } from '../FieldRow'
import { NumberField } from '../NumberField'
import { PartTimeFields } from './PartTimeFields'
import { Section, type PersonEditor } from './shared'

// Who this person is, and when their work income stops. Everything else in the form hangs off these.
export function AboutSection({ person, edit, withoutSalary = false }: PersonEditor & { /** The salary belongs to the tax notice: the stepper asks for it there. */ withoutSalary?: boolean }) {
  const t = useT()
  const a = t.profile.about
  return (
    <Section title={a.title} icon="user-bold">
      <FieldRow label={a.name}>
        {(w) => (
          <EditField as="div" value={person.name} onChange={(name) => edit((x) => ({ ...x, name }))} submitIcon={null} maxLength={60} id={w.id} ariaLabel={a.name} />
        )}
      </FieldRow>
      <FieldRow label={a.birthYear}>
        {(w) => (
          <NumberField kind="year" min={1900} max={2100} value={person.birth.year} onChange={(year) => edit((x) => ({ ...x, birth: { ...x.birth, year } }))} id={w.id} />
        )}
      </FieldRow>
      <FieldRow label={a.birthMonth} hint={a.birthHint}>
        {(w) => (
          <NumberField kind="int" min={1} max={12} value={person.birth.month} onChange={(month) => edit((x) => ({ ...x, birth: { ...x.birth, month } }))} id={w.id} ariaDescribedBy={w.describedBy} />
        )}
      </FieldRow>
      <FieldRow label={a.retirementAge} hint={a.retirementHint}>
        {(w) => (
          <NumberField kind="int" min={18} max={80} unit={t.fields.years} value={person.retirementAge} onChange={(retirementAge) => edit((x) => ({ ...x, retirementAge }))} id={w.id} ariaDescribedBy={w.describedBy} />
        )}
      </FieldRow>
      {!withoutSalary && (
      <FieldRow label={a.salary} infoId="salary" hint={a.salaryHint} fact={factId(person.id, 'salary')}>
        {(w) => <NumberField kind="money" max={1e8} value={person.salaryToday} onChange={(salaryToday) => edit((x) => ({ ...x, salaryToday }))} id={w.id} ariaDescribedBy={w.describedBy} />}
      </FieldRow>
      )}
      <PartTimeFields person={person} edit={edit} />
    </Section>
  )
}

import { useLang, useT } from '../../i18n'
import { CARD_COPY } from '../../lib/cardCopy'
import { factId } from '../../lib/facts'
import { setBirthYear } from '../../lib/profileEdit'
import { EditField } from '../EditField'
import { FieldRow } from '../FieldRow'
import { NumberField } from '../NumberField'
import { NumberSlider } from '../NumberSlider'
import { PartTimeFields } from './PartTimeFields'
import { Section, type PersonEditor } from './shared'

// Who this person is, and when their work income stops. Everything else in the form hangs off these.
export function AboutSection({ person, edit, withoutSalary = false, withoutPartTime = false }: PersonEditor & { /** The salary belongs to the tax notice: the stepper asks for it there. */ withoutSalary?: boolean; /** Work kept after retiring: asked only of someone who said they will (« Ma situation »). */ withoutPartTime?: boolean }) {
  const t = useT()
  const a = t.profile.about
  const { lang } = useLang()
  return (
    <Section title={a.title} subtitle={CARD_COPY[lang].about} concept="personne">
      <FieldRow label={a.name} help="name">
        {(w) => (
          <EditField as="div" value={person.name} onChange={(name) => edit((x) => ({ ...x, name }))} submitIcon={null} maxLength={60} id={w.id} ariaLabel={a.name} />
        )}
      </FieldRow>
      <FieldRow label={a.birthYear} help="birthYear">
        {(w) => (
          <NumberField kind="year" min={1900} max={2100} value={person.birth.year} onChange={(year) => edit((x) => setBirthYear(x, year))} id={w.id} />
        )}
      </FieldRow>
      <FieldRow label={a.birthMonth} help="birthMonth" hint={a.birthHint}>
        {(w) => (
          <NumberField kind="int" min={1} max={12} value={person.birth.month} onChange={(month) => edit((x) => ({ ...x, birth: { ...x.birth, month } }))} id={w.id} ariaDescribedBy={w.describedBy} />
        )}
      </FieldRow>
      {/* Income, then the age it stops: the order the first visit asks in. */}
      {!withoutSalary && (
      <FieldRow label={a.salary} infoId="salary" hint={a.salaryHint} fact={factId(person.id, 'salary')}>
        {(w) => <NumberField kind="money" max={1e8} value={person.salaryToday} onChange={(salaryToday) => edit((x) => ({ ...x, salaryToday }))} id={w.id} ariaDescribedBy={w.describedBy} />}
      </FieldRow>
      )}
      <NumberSlider kind="int" label={a.retirementAge} help="retirementAge" hint={a.retirementHint} min={40} max={75} bounds={[18, 80]} step={1} value={person.retirementAge} onChange={(retirementAge) => edit((x) => ({ ...x, retirementAge }))} marks={[55,60,65,70].map((value) => ({ value, label: String(value) }))} />
      {!withoutPartTime && <PartTimeFields person={person} edit={edit} />}
    </Section>
  )
}

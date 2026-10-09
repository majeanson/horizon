import { useLang, useT } from '../../i18n'
import { ENTRY_COPY } from '../../lib/entryCopy'
import { factId } from '../../lib/facts'
import { FieldRow } from '../FieldRow'
import { NumberField } from '../NumberField'
import { Section, type PersonEditor } from './shared'

// What the tax notice and the CRA account hold, together: the salary the notice shows, and the room left to contribute to the RRSP and the TFSA. On the
// profile these sit with the salary (« À propos ») and with each account; in « Saisie par document » they are ONE step, since they come from one document.
// The same fields, the same store, the same confirmation marks — only gathered.
export function TaxFields({ person, edit }: PersonEditor) {
  const t = useT()
  const { lang } = useLang()
  const c = ENTRY_COPY[lang]
  const a = t.profile.about
  const ac = t.profile.accounts
  const room = (kind: 'rrsp' | 'tfsa') => (
    <fieldset className="account-group">
      <legend className="account-group__title mono">{ac[kind]}</legend>
      <FieldRow label={ac.room} infoId={kind === 'rrsp' ? 'rrspRoom' : 'tfsaRoom'} fact={factId(person.id, kind === 'rrsp' ? 'rrspRoom' : 'tfsaRoom')}>
        {(w) => (
          <NumberField
            kind="money"
            max={1e9}
            value={person.accounts[kind].room}
            onChange={(next) => edit((x) => ({ ...x, accounts: { ...x.accounts, [kind]: { ...x.accounts[kind], room: next } } }))}
            id={w.id}
          />
        )}
      </FieldRow>
    </fieldset>
  )
  return (
    <Section title={c.taxTitle} subtitle={c.taxHint} icon="identification-card-bold">
      <FieldRow label={a.salary} infoId="salary" hint={a.salaryHint} fact={factId(person.id, 'salary')}>
        {(w) => <NumberField kind="money" max={1e8} value={person.salaryToday} onChange={(salaryToday) => edit((x) => ({ ...x, salaryToday }))} id={w.id} ariaDescribedBy={w.describedBy} />}
      </FieldRow>
      {room('rrsp')}
      {room('tfsa')}
    </Section>
  )
}

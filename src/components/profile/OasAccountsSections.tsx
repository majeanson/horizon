import type { ReactNode } from 'react'
import type { Person } from '../../engine/types'
import type { InfoId } from '../../i18n'
import { useT } from '../../i18n'
import { Chip } from '../Chip'
import { FieldRow } from '../FieldRow'
import { NumberField } from '../NumberField'
import { Section, type PersonEditor } from './shared'

// Old Age Security (when it starts, and the residence that decides how much), then the three kinds of savings
// account. Grouped in one file because each is a short list of the same FieldRow + NumberField pair.

export function OasSection({ person, edit }: PersonEditor) {
  const t = useT()
  const o = t.profile.oas
  return (
    <Section title={o.title} icon="house-bold">
      <FieldRow label={o.residentSince} infoId="oasResidence" hint={o.residentHint}>
        {(w) => (
          <NumberField kind="year" min={1900} max={2100} value={person.oas.residentSince} onChange={(residentSince) => edit((x) => ({ ...x, oas: { ...x.oas, residentSince } }))} id={w.id} ariaDescribedBy={w.describedBy} />
        )}
      </FieldRow>
      {/* The quick answer for someone born here: the year of birth (the OAS counts only the years after 18, whatever is written). */}
      <Chip selected={person.oas.residentSince <= person.birth.year} onClick={() => edit((x) => ({ ...x, oas: { ...x.oas, residentSince: x.birth.year } }))}>
        {o.sinceBirth}
      </Chip>
      <FieldRow label={o.startAge} infoId="oasStartAge" hint={o.startHint}>
        {(w) => (
          <NumberField kind="int" min={65} max={70} unit={t.fields.years} value={person.oas.startAge} onChange={(startAge) => edit((x) => ({ ...x, oas: { ...x.oas, startAge } }))} id={w.id} ariaDescribedBy={w.describedBy} />
        )}
      </FieldRow>
    </Section>
  )
}

type Registered = 'rrsp' | 'tfsa'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="account-group">
      <legend className="account-group__title mono">{title}</legend>
      {children}
    </fieldset>
  )
}

// One registered account: its balance, the room left, and what the person plans to add each year.
function RegisteredGroup({ kind, person, edit, info }: PersonEditor & { kind: Registered; info: { balance: InfoId; room: InfoId } }) {
  const t = useT()
  const a = t.profile.accounts
  const account = person.accounts[kind]
  const set = (patch: Partial<Person['accounts'][Registered]>) => edit((x) => ({ ...x, accounts: { ...x.accounts, [kind]: { ...x.accounts[kind], ...patch } } }))
  return (
    <Group title={a[kind]}>
      <FieldRow label={a.balance} infoId={info.balance}>
        {(w) => <NumberField kind="money" max={1e9} value={account.balance} onChange={(balance) => set({ balance })} id={w.id} />}
      </FieldRow>
      <FieldRow label={a.room} infoId={info.room}>
        {(w) => <NumberField kind="money" max={1e9} value={account.room} onChange={(room) => set({ room })} id={w.id} />}
      </FieldRow>
      <FieldRow label={a.contribution} hint={a.contributionHint}>
        {(w) => <NumberField kind="money" max={1e9} value={account.annualContribution} onChange={(annualContribution) => set({ annualContribution })} id={w.id} ariaDescribedBy={w.describedBy} />}
      </FieldRow>
    </Group>
  )
}

export function AccountsSection({ person, edit }: PersonEditor) {
  const t = useT()
  const a = t.profile.accounts
  const nonReg = person.accounts.nonReg
  const setNonReg = (patch: Partial<typeof nonReg>) => edit((x) => ({ ...x, accounts: { ...x.accounts, nonReg: { ...x.accounts.nonReg, ...patch } } }))
  return (
    <Section title={a.title} icon="lock-bold">
      <RegisteredGroup kind="rrsp" person={person} edit={edit} info={{ balance: 'rrspBalance', room: 'rrspRoom' }} />
      <RegisteredGroup kind="tfsa" person={person} edit={edit} info={{ balance: 'tfsaBalance', room: 'tfsaRoom' }} />
      <Group title={a.nonReg}>
        <FieldRow label={a.balance} infoId="nonRegBalance">
          {(w) => <NumberField kind="money" max={1e9} value={nonReg.balance} onChange={(balance) => setNonReg({ balance })} id={w.id} />}
        </FieldRow>
        <FieldRow label={a.acb} infoId="nonRegAcb" hint={a.acbHint}>
          {(w) => <NumberField kind="money" max={1e9} value={nonReg.acb} onChange={(acb) => setNonReg({ acb })} id={w.id} ariaDescribedBy={w.describedBy} />}
        </FieldRow>
        <FieldRow label={a.contribution} hint={a.contributionHint}>
          {(w) => <NumberField kind="money" max={1e9} value={nonReg.annualContribution} onChange={(annualContribution) => setNonReg({ annualContribution })} id={w.id} ariaDescribedBy={w.describedBy} />}
        </FieldRow>
      </Group>
    </Section>
  )
}

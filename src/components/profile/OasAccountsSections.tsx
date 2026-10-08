import { useState, type ReactNode } from 'react'
import type { Person } from '../../engine/types'
import type { InfoId } from '../../i18n'
import { useLang, useT } from '../../i18n'
import { factId } from '../../lib/facts'
import { formatMoney } from '../../lib/money'
import { setRrspBalance } from '../../lib/profileEdit'
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
    <Section title={o.title} icon="identification-card-bold">
      <FieldRow label={o.residentSince} infoId="oasResidence" hint={o.residentHint} fact={factId(person.id, 'residence')}>
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

// The locked-in part of the REER (an RVER with an employer, a CRI, a FRV). Most people have none, so it is ONE folded line: nothing
// is asked until it is opened, and it opens on its own when a value is already there. Folding it never clears a value — folded
// with one, the line says so, so nothing is hidden and forgotten.
function LockedPart({ person, set }: { person: Person; set: (patch: Partial<Person['accounts']['rrsp']>) => void }) {
  const t = useT()
  const { lang } = useLang()
  const a = t.profile.accounts
  const rrsp = person.accounts.rrsp
  const locked = rrsp.lockedIn ?? 0
  const employer = rrsp.employerContribution ?? 0
  const [open, setOpen] = useState(locked > 0 || employer > 0)
  return (
    <>
      <Chip selected={open} expanded={open} onClick={() => setOpen((o) => !o)}>
        {a.lockedToggle}
        {!open && locked > 0 ? ` · ${formatMoney(locked, lang)}` : ''}
      </Chip>
      {open && (
        <>
          <FieldRow label={a.locked} infoId="rrspLocked" hint={a.lockedHint} fact={factId(person.id, 'rrspLocked')}>
            {(w) => <NumberField kind="money" max={rrsp.balance} value={locked} onChange={(lockedIn) => set({ lockedIn })} id={w.id} ariaDescribedBy={w.describedBy} />}
          </FieldRow>
          <FieldRow label={a.employerContribution} hint={a.employerHint}>
            {(w) => <NumberField kind="money" max={1e9} value={employer} onChange={(employerContribution) => set({ employerContribution })} id={w.id} ariaDescribedBy={w.describedBy} />}
          </FieldRow>
        </>
      )}
    </>
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
      <FieldRow label={a.balance} infoId={info.balance} fact={factId(person.id, kind === 'rrsp' ? 'rrspBalance' : 'tfsaBalance')}>
        {(w) => <NumberField kind="money" max={1e9} value={account.balance} onChange={(balance) => (kind === 'rrsp' ? edit((x) => setRrspBalance(x, balance)) : set({ balance }))} id={w.id} />}
      </FieldRow>
      <FieldRow label={a.room} infoId={info.room} fact={factId(person.id, kind === 'rrsp' ? 'rrspRoom' : 'tfsaRoom')}>
        {(w) => <NumberField kind="money" max={1e9} value={account.room} onChange={(room) => set({ room })} id={w.id} />}
      </FieldRow>
      <FieldRow label={a.contribution} hint={a.contributionHint}>
        {(w) => <NumberField kind="money" max={1e9} value={account.annualContribution} onChange={(annualContribution) => set({ annualContribution })} id={w.id} ariaDescribedBy={w.describedBy} />}
      </FieldRow>
      {kind === 'rrsp' && <LockedPart person={person} set={set} />}
    </Group>
  )
}

export function AccountsSection({ person, edit }: PersonEditor) {
  const t = useT()
  const a = t.profile.accounts
  const nonReg = person.accounts.nonReg
  const setNonReg = (patch: Partial<typeof nonReg>) => edit((x) => ({ ...x, accounts: { ...x.accounts, nonReg: { ...x.accounts.nonReg, ...patch } } }))
  return (
    <Section title={a.title} icon="piggy-bank-bold">
      <RegisteredGroup kind="rrsp" person={person} edit={edit} info={{ balance: 'rrspBalance', room: 'rrspRoom' }} />
      <RegisteredGroup kind="tfsa" person={person} edit={edit} info={{ balance: 'tfsaBalance', room: 'tfsaRoom' }} />
      <Group title={a.nonReg}>
        <FieldRow label={a.balance} infoId="nonRegBalance" fact={factId(person.id, 'nonRegBalance')}>
          {(w) => <NumberField kind="money" max={1e9} value={nonReg.balance} onChange={(balance) => setNonReg({ balance })} id={w.id} />}
        </FieldRow>
        <FieldRow label={a.acb} infoId="nonRegAcb" hint={a.acbHint} fact={factId(person.id, 'nonRegAcb')}>
          {(w) => <NumberField kind="money" max={1e9} value={nonReg.acb} onChange={(acb) => setNonReg({ acb })} id={w.id} ariaDescribedBy={w.describedBy} />}
        </FieldRow>
        <FieldRow label={a.contribution} hint={a.contributionHint}>
          {(w) => <NumberField kind="money" max={1e9} value={nonReg.annualContribution} onChange={(annualContribution) => setNonReg({ annualContribution })} id={w.id} ariaDescribedBy={w.describedBy} />}
        </FieldRow>
      </Group>
    </Section>
  )
}

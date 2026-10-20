import { useId } from 'react'
import { useLang } from '../../../i18n'
import { FACSIMILE_COPY } from '../../../lib/facsimileCopy'
import { factId } from '../../../lib/facts'
import { setFact } from '../../../lib/profileEdit'
import { updateProfile } from '../../../lib/store'
import { NumberField } from '../../NumberField'
import type { PersonEditor } from '../shared'
import { FacsimileFrame } from './FacsimileFrame'

// The CRA account's « Savings and pension plans » screen: « RRSP deduction limit » and « TFSA contribution room — As of January 1 », in the CRA's own
// words in the reader's language (the French ones as the CRA's help pages name them — lib/facsimileCopy.ts). The boxes are the form's rrspRoom / tfsaRoom. A figure TYPED here is copied off the document, so it
// confirms the same fact the form's ✓ would (as « Coller mon relevé » does for the earnings); a figure the reader only looks at stays as it was.

function Row({ person, edit, kind, label }: PersonEditor & { kind: 'rrsp' | 'tfsa'; label: string }) {
  const id = useId()
  const fact = factId(person.id, kind === 'rrsp' ? 'rrspRoom' : 'tfsaRoom')
  return (
    <div className="facsimile__row">
      <label className="facsimile__label" htmlFor={id}>
        {label}
      </label>
      <NumberField
        kind="money"
        max={1e9}
        value={person.accounts[kind].room}
        onChange={(room) => {
          edit((x) => ({ ...x, accounts: { ...x.accounts, [kind]: { ...x.accounts[kind], room } } }))
          updateProfile((p) => setFact(p, fact, true))
        }}
        id={id}
      />
    </div>
  )
}

export function CraFacsimile({ person, edit }: PersonEditor) {
  const { lang } = useLang()
  const c = FACSIMILE_COPY[lang]
  const q = c.quotes.cra
  return (
    <FacsimileFrame hint={c.cra.hint} frame={c.cra.frame} label={c.cra.groupLabel}>
      <p className="facsimile__screen" lang="en">
        {q.screen}
      </p>
      <div lang="en">
        <Row person={person} edit={edit} kind="rrsp" label={q.rrsp} />
        <Row person={person} edit={edit} kind="tfsa" label={q.tfsa} />
      </div>
    </FacsimileFrame>
  )
}

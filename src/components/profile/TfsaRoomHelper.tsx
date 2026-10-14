import { useState } from 'react'
import { useLang } from '../../i18n'
import { factId } from '../../lib/facts'
import { formatMoney } from '../../lib/money'
import { setFact } from '../../lib/profileEdit'
import { updateProfile } from '../../lib/store'
import { tfsaRoom, tfsaYearlyLimit } from '../../lib/tfsaRoom'
import { TFSA_ROOM_COPY } from '../../lib/tfsaRoomCopy'
import { Chip } from '../Chip'
import { FieldRow } from '../FieldRow'
import { Fold } from '../Fold'
import { NumberField } from '../NumberField'
import type { PersonEditor } from './shared'

// The TFSA room left today, from the CRA's January 1 figure and this year's deposits (lib/tfsaRoom.ts). Nothing is stored until the person uses the result: the two
// boxes are a worksheet. Using it writes the room and confirms it — it rests on a CRA figure and the person's own deposits.
export function TfsaRoomHelper({ person, edit }: PersonEditor) {
  const { lang } = useLang()
  const c = TFSA_ROOM_COPY[lang]
  const [jan1, setJan1] = useState<number | null>(null)
  const [deposited, setDeposited] = useState<number | null>(null)
  const limit = tfsaYearlyLimit()
  const room = jan1 === null ? null : tfsaRoom(jan1, deposited ?? 0, limit)
  const use = () => {
    if (room === null) return
    edit((x) => ({ ...x, accounts: { ...x.accounts, tfsa: { ...x.accounts.tfsa, room: room.today } } }))
    updateProfile((p) => setFact(p, factId(person.id, 'tfsaRoom'), true))
  }
  return (
    <Fold summary={c.summary}>
      <FieldRow label={c.jan1} hint={c.jan1Hint}>
        {(w) => <NumberField kind="money" allowEmpty max={1e9} value={jan1} onChange={setJan1} id={w.id} ariaDescribedBy={w.describedBy} />}
      </FieldRow>
      <FieldRow label={c.deposited} hint={c.depositedHint}>
        {(w) => <NumberField kind="money" allowEmpty max={1e9} value={deposited} onChange={setDeposited} id={w.id} ariaDescribedBy={w.describedBy} />}
      </FieldRow>
      {room !== null && (
        <div role="status">
          <p className="field-row__hint">
            <strong>{c.today(formatMoney(room.today, lang, { cents: true }))}</strong> {c.next(formatMoney(room.nextJanuary, lang, { cents: false }), formatMoney(limit, lang, { cents: false }))}
          </p>
          {room.overBy > 0 && <p className="field-row__hint">{c.over(formatMoney(room.overBy, lang, { cents: true }))}</p>}
          <Chip onClick={use}>{c.use}</Chip>
        </div>
      )}
    </Fold>
  )
}

import { useLang } from '../../i18n'
import { CASH_BUFFER_BAND, cashBuffer } from '../../lib/cashBuffer'
import { CASH_BUFFER_COPY } from '../../lib/cashBufferCopy'
import { formatDecimal, formatInt } from '../../lib/format'
import { formatMoney } from '../../lib/money'
import type { Profile } from '../../lib/schema'
import { AccordionItem } from '../Accordion'
import { Fold } from '../Fold'
import { StatusMessage } from '../StatusMessage'

// « Coussin de liquidités » on the sheet: how many months of retired spending the TFSA and the non-registered accounts hold, against a 6–12 month band. It used to be a
// card on Profil, among the fields — a readout that changes nothing and that the engine never reads belongs where the household is READ, not where it is typed. The band
// is a rule of thumb: its caveat is one tap away. Nothing to say (no spending or no accounts known) draws nothing.
/** Whether the card has anything to say: the sheet's map lists it only then. */
export const cashBufferShown = (profile: Profile): boolean => cashBuffer(profile.household).status !== 'unknown'

export function CashBufferCard({ profile }: { profile: Profile }) {
  const { lang } = useLang()
  const c = CASH_BUFFER_COPY[lang]
  const buffer = cashBuffer(profile.household)
  if (buffer.status === 'unknown') return null
  const min = formatInt(CASH_BUFFER_BAND.min, lang)
  const max = formatInt(CASH_BUFFER_BAND.max, lang)
  const line = buffer.status === 'empty' ? c.empty(min, max) : c[buffer.status](formatDecimal(buffer.months, lang, 1), min, max)
  return (
    <AccordionItem id="coussin" className="sheet__section" title={c.title} subtitle={c.basis(formatMoney(buffer.liquid, lang))} concept="coussin" nav={false}>
      <StatusMessage tone={buffer.status === 'within' ? 'success' : 'info'}>{line}</StatusMessage>
      <Fold summary={c.caveatTitle}>
        <p className="field-row__hint">{c.caveat}</p>
      </Fold>
    </AccordionItem>
  )
}

import { useLang } from '../../i18n'
import { CASH_BUFFER_BAND, cashBuffer } from '../../lib/cashBuffer'
import { CASH_BUFFER_COPY } from '../../lib/cashBufferCopy'
import { formatDecimal, formatInt } from '../../lib/format'
import { formatMoney } from '../../lib/money'
import { useProfile } from '../../lib/store'
import { StatusMessage } from '../StatusMessage'
import { Section } from './shared'

// How many months of retired spending the TFSA and the non-registered accounts hold, against a 6–12 month band. A readout under the
// accounts: it changes nothing and the engine never reads it. Loaded on its own (the copy stays out of the first screen).
export default function CashBufferLine() {
  const { lang } = useLang()
  const profile = useProfile()
  const c = CASH_BUFFER_COPY[lang]
  const buffer = cashBuffer(profile.household)
  if (buffer.status === 'unknown') return null
  const min = formatInt(CASH_BUFFER_BAND.min, lang)
  const max = formatInt(CASH_BUFFER_BAND.max, lang)
  const months = formatDecimal(buffer.months, lang, 1)
  const line = buffer.status === 'empty' ? c.empty(min, max) : c[buffer.status](months, min, max)
  return (
    <Section title={c.title} icon="piggy-bank-bold" subtitle={`${c.basis(formatMoney(buffer.liquid, lang))} ${c.caveat}`}>
      <StatusMessage tone={buffer.status === 'within' ? 'success' : 'info'}>{line}</StatusMessage>
    </Section>
  )
}

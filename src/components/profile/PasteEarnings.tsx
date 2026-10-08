import { useId, useMemo, useState } from 'react'
import { useLang } from '../../i18n'
import { factId } from '../../lib/facts'
import { formatMoney } from '../../lib/money'
import { PASTE_COPY } from '../../lib/pasteCopy'
import { earningsFromPaste, parseEarningsPaste } from '../../lib/pasteEarnings'
import { setFact } from '../../lib/profileEdit'
import { updateProfile } from '../../lib/store'
import { useNotice } from '../../lib/toast'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'
import { StatusMessage } from '../StatusMessage'
import type { PersonEditor } from './shared'

// « Coller mon relevé » — the pensionable earnings, from the relevé de participation's own table instead of thirty boxes. The text is read
// here, on the device; what was understood is shown BEFORE it is applied, and applying marks the earnings as confirmed (they came from the
// document). A year the person has not lived at working age is left out: the list the page shows is the list that can hold a figure.

export function PasteEarnings({ person, edit, years }: PersonEditor & { years: readonly number[] }) {
  const { lang } = useLang()
  const c = PASTE_COPY[lang]
  const notice = useNotice()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [column, setColumn] = useState(0)

  const lastYear = years.length > 0 ? years[years.length - 1] : 0
  const read = useMemo(() => parseEarningsPaste(text, lastYear), [text, lastYear])
  const wanted = useMemo(() => new Set(years), [years])
  const chosen = useMemo(() => {
    const all = earningsFromPaste(read.rows, Math.min(column, Math.max(0, read.columns - 1)))
    return Object.fromEntries(Object.entries(all).filter(([y]) => wanted.has(Number(y)))) as Record<number, number>
  }, [read, column, wanted])
  const count = Object.keys(chosen).length
  const replaced = Object.keys(chosen).filter((y) => person.earningsHistory[Number(y)] !== undefined && person.earningsHistory[Number(y)] !== chosen[Number(y)]).length
  const sampleRow = read.rows.find((r) => r.amounts.length > Math.min(column, read.columns - 1))
  const close = () => {
    setOpen(false)
    setText('')
    setColumn(0)
  }

  const apply = () => {
    if (count === 0) return
    edit((x) => ({ ...x, earningsHistory: { ...x.earningsHistory, ...chosen } }))
    updateProfile((p) => setFact(p, factId(person.id, 'earnings'), true))
    notice(c.applied(count))
    close()
  }

  return (
    <>
      <Chip expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        {c.open}
      </Chip>
      {open && (
        <div className="earnings__paste">
          <p className="field-row__hint">{c.hint}</p>
          <textarea id={id} className="input" rows={6} value={text} placeholder={c.placeholder} aria-label={c.label} onChange={(e) => setText(e.target.value)} spellCheck={false} />
          {text.trim() !== '' && (
            <StatusMessage tone={count > 0 ? 'success' : 'info'}>
              {count > 0 ? c.found(read.rows.length, read.rows[0].year, read.rows[read.rows.length - 1].year, read.skipped) : c.nothing}
            </StatusMessage>
          )}
          {read.columns > 1 && (
            <Cluster>
              {Array.from({ length: read.columns }, (_, i) => (
                <Chip key={i} selected={column === i} onClick={() => setColumn(i)}>
                  {c.column(i + 1, sampleRow ? formatMoney(sampleRow.amounts[i] ?? 0, lang) : '')}
                </Chip>
              ))}
            </Cluster>
          )}
          {replaced > 0 && <p className="field-row__hint">{c.replaces(replaced)}</p>}
          <Cluster>
            <Chip onClick={apply} disabled={count === 0}>
              {c.apply}
            </Chip>
            <Chip onClick={close}>{c.cancel}</Chip>
          </Cluster>
        </div>
      )}
    </>
  )
}

import { useMemo, useState, type ChangeEvent } from 'react'
import { useLang } from '../../i18n'
import { readBank, summarize, totalOf } from '../../lib/bankImport'
import { BANK_IMPORT_COPY } from '../../lib/bankImportCopy'
import { factId } from '../../lib/facts'
import { formatMoney } from '../../lib/money'
import { setFact, setSpending } from '../../lib/profileEdit'
import { updateProfile } from '../../lib/store'
import { useNotice } from '../../lib/toast'
import { Chip } from '../Chip'
import { Fold } from '../Fold'
import { Cluster } from '../Layout'
import { StatusMessage } from '../StatusMessage'

// « Importer un relevé de banque »: the transactions of a bank's CSV export, counted by category over the last twelve complete months (lib/bankImport.ts). Read here, on the
// device — a file or pasted text, never sent anywhere. The person ticks what belongs in the budget and uses the total, which sets the spending while working and confirms
// it: it comes from a statement, which is what « confirmé » means.
const pad = (n: number) => String(n).padStart(2, '0')

export function BankImport() {
  const { lang } = useLang()
  const c = BANK_IMPORT_COPY[lang]
  const notice = useNotice()
  const [text, setText] = useState('')
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  const read = useMemo(() => readBank(text), [text])
  const summary = useMemo(() => summarize(read.rows), [read.rows])
  const money = (n: number) => formatMoney(Math.round(n), lang, { cents: false })
  const ticked = useMemo(() => new Set((summary?.groups ?? []).filter((g) => toggled[g.name] ?? g.include).map((g) => g.name)), [summary, toggled])
  const total = summary === null ? 0 : totalOf(summary.groups, ticked)
  const month = (m: { year: number; month: number }) => `${pad(m.month)}/${m.year}`

  const load = (next: string) => {
    setText(next)
    setToggled({})
  }
  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])]
    load((await Promise.all(files.map((f) => f.text()))).join('\n'))
    e.target.value = ''
  }
  const apply = () => {
    updateProfile((p) => setFact(setSpending(p, { workingToday: Math.round(total) }), factId('household', 'spendingWorking'), true))
    notice(c.applied(money(total)))
    load('')
  }

  return (
    <Fold summary={c.open}>
      <p className="field-row__hint">{c.hint}</p>
      <label className="field-row__hint">
        <span>{c.file} </span>
        <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values" multiple onChange={onFiles} />
      </label>
      <textarea className="input" rows={5} value={text} placeholder={c.placeholder} aria-label={c.label} onChange={(e) => load(e.target.value)} spellCheck={false} />
      {text.trim() !== '' && summary === null && <StatusMessage tone="info">{c.nothing}</StatusMessage>}
      {summary !== null && (
        <div role="status">
          <p className="field-row__hint">
            {c.found(read.rows.length, month(summary.from), month(summary.to), read.skipped)} {summary.months < 12 && c.scaled(summary.months)}
          </p>
          <Cluster role="group" aria-label={c.groupsTitle}>
            {summary.groups.map((g) => (
              <Chip key={g.name} selected={ticked.has(g.name)} onClick={() => setToggled((t) => ({ ...t, [g.name]: !ticked.has(g.name) }))}>
                {g.name} · {money(g.annual)}
              </Chip>
            ))}
          </Cluster>
          <p className="field-row__hint">{c.tipMortgage}</p>
          <p>
            <strong>{c.total(money(total), money(total / 12))}</strong>
          </p>
          <Chip onClick={apply}>{c.apply}</Chip>
        </div>
      )}
    </Fold>
  )
}

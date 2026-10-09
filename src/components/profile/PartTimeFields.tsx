import { useLang, useT } from '../../i18n'
import { formatPct } from '../../lib/format'
import { LIFE_COPY } from '../../lib/lifeCopy'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'
import { FieldRow } from '../FieldRow'
import { NumberField } from '../NumberField'
import type { PersonEditor } from './shared'

// Work kept after the retirement age: a share of the salary until an age. Off by default — most plans say « I stop », and the retirement
// age above already means that. Turning it on offers two figures (the share, the age) and says in one line what they mean; the engine
// pays, taxes and charges it like any work income (engine/lifeEvents.ts `partTimePay`).
export function PartTimeFields({ person, edit }: PersonEditor) {
  const t = useT()
  const { lang } = useLang()
  const c = LIFE_COPY[lang].partTime
  const pt = person.partTime ?? null
  const set = (partTime: { untilAge: number; share: number } | null) => edit((x) => ({ ...x, partTime }))
  return (
    <div className="part-time">
      <p className="field-row__label">{c.title}</p>
      <p className="field-row__hint">{c.hint}</p>
      <Cluster role="radiogroup" aria-label={c.title}>
        <Chip radio selected={pt === null} onClick={() => set(null)}>
          {c.off}
        </Chip>
        <Chip radio selected={pt !== null} onClick={() => pt === null && set({ share: 0.4, untilAge: Math.min(80, person.retirementAge + 3) })}>
          {c.on}
        </Chip>
      </Cluster>
      {pt !== null && (
        <>
          <FieldRow label={c.share} hint={c.shareHint}>
            {(w) => <NumberField kind="percent" min={0.05} max={1} value={pt.share} onChange={(share) => set({ ...pt, share })} id={w.id} ariaDescribedBy={w.describedBy} />}
          </FieldRow>
          <FieldRow label={c.until} hint={c.untilHint}>
            {(w) => <NumberField kind="int" min={50} max={80} unit={t.fields.years} value={pt.untilAge} onChange={(untilAge) => set({ ...pt, untilAge })} id={w.id} ariaDescribedBy={w.describedBy} />}
          </FieldRow>
          <p className="field-row__hint">{pt.untilAge > person.retirementAge ? c.summary(formatPct(pt.share, lang, 0), person.retirementAge, pt.untilAge) : c.nothing(person.retirementAge, pt.untilAge)}</p>
        </>
      )}
    </div>
  )
}

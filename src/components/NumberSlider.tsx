import { useId, useState, type ReactNode } from 'react'
import type { InfoId } from '../i18n'
import { useLang, useT } from '../i18n'
import type { HelpId } from '../lib/fieldHelpCopy'
import { formatPct } from '../lib/format'
import { Chip } from './Chip'
import { FieldHelp } from './FieldHelp'
import { FieldInfo } from './FieldInfo'
import { glossed } from './Gloss'
import { NumberField } from './NumberField'
import { Slider, type SliderMark } from './Slider'

// The thumb-friendly twin of a `NumberField`, for a figure that lives in a SMALL, KNOWN range — an age, a rate, a share —
// where a thumb on a track with reference marks (« prudent · neutre · audacieux », « 60 · 65 · 70 ») says more than a
// typed number and needs no keyboard. Money and anything open-ended stays a `NumberField`.
//
// It speaks the STORED unit like the box does (a percent is a fraction, 0.021) and keeps the same `min` / `max`; the
// track works in the unit shown (points for a percent) so a step is « 0,1 % », never a float. A stored value outside the
// range or between two steps is still shown honestly: the track widens to hold it.
// « Saisir le chiffre exact » swaps the track for the plain NumberField (same bounds, same label) for the figure that sits between
// two steps or that someone simply knows; « Revenir au curseur » swaps back.
//
//   <NumberSlider kind="percent" label="Inflation" infoId="inflation" min={-0.02} max={0.08} step={0.001}
//     value={a.inflation} onChange={…} marks={[{ value: 0.025, label: 'Prudent', tone: 'prudent' }, …]} />

export type NumberSliderKind = 'percent' | 'int'

const clean = (n: number) => Math.round(n * 1e6) / 1e6

export function NumberSlider({
  kind,
  label,
  infoId,
  help,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  bounds,
  digits = 1,
  unit,
  marks,
  info,
}: {
  kind: NumberSliderKind
  label: string
  infoId?: InfoId
  help?: HelpId
  hint?: ReactNode
  value: number
  onChange: (value: number) => void
  /** In the STORED unit (a fraction for a percent), as on the NumberField it stands for. */
  min: number
  max: number
  /** In the stored unit too: 0.001 is a tenth of a point. */
  step: number
  /** What the exact box accepts when it is wider than the track (the field's own min / max); the track's by default. */
  bounds?: readonly [number, number]
  /** Decimals printed for a percent. */
  digits?: number
  /** After an int (« ans »). */
  unit?: string
  /** Reference values, in the stored unit. */
  marks?: readonly SliderMark[]
  info?: (v: number) => ReactNode
}) {
  const t = useT()
  const { lang } = useLang()
  const [exact, setExact] = useState(false)
  const boxId = useId()
  const scale = kind === 'percent' ? 100 : 1
  const u = unit ?? (kind === 'int' ? t.fields.years : '')
  const shownValue = clean(value * scale)
  const text = (v: number) => (kind === 'percent' ? formatPct(v / scale, lang, digits) : u ? `${v} ${u}` : String(v))
  const tools = infoId ? <FieldInfo id={infoId} label={label} /> : help ? <FieldHelp id={help} label={label} /> : undefined
  if (exact) {
    return (
      <div className="field-row number-slider">
        <div className="field-row__head">
          <label className="field-row__label" htmlFor={boxId}>
            {label}
          </label>
          {tools && <span className="field-row__tools">{tools}</span>}
        </div>
        <div className="field-row__control">
          <div className="field-row__box">
            <NumberField kind={kind} min={bounds?.[0] ?? min} max={bounds?.[1] ?? max} unit={kind === 'int' ? u : undefined} value={value} onChange={onChange} id={boxId} />
          </div>
        </div>
        {hint && <p className="field-row__hint">{glossed(hint)}</p>}
        <Chip expanded onClick={() => setExact(false)}>
          {t.fields.exactClose}
        </Chip>
      </div>
    )
  }
  return (
    <div className="number-slider">
      <Slider
        label={label}
        tools={tools}
        hint={hint ? glossed(hint) : undefined}
        value={shownValue}
        min={Math.min(clean(min * scale), shownValue)}
        max={Math.max(clean(max * scale), shownValue)}
        step={clean(step * scale)}
        valueText={text}
        onCommit={(v) => onChange(clean(v / scale))}
        marks={marks?.map((m) => ({ ...m, value: clean(m.value * scale) }))}
        info={info}
      />
      <Chip expanded={false} onClick={() => setExact(true)}>
        {t.fields.exact}
      </Chip>
    </div>
  )
}

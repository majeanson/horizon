import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import { Chip } from './Chip'
import { Icon } from './Icon'

// A range control for a number whose effect is worth SEEING while it moves.
//
// It owns the position while the thumb is dragged (or a key is held) and reports it twice: `onPreview` on every step —
// cheap, the caller shows what the number would do — and `onCommit` once when the person lets go (pointer up, key up,
// focus leaving), which is when the caller saves it and the heavy answers are recomputed. The number is always readable
// beside the thumb (`valueText`).
//
// Easy to move, on a finger and on a mouse: a large thumb on a thick track, a vertical swipe that still scrolls the
// page (`touch-action: pan-y`), and a « − » / « + » button each side for the exact step — the keyboard, a mouse and a
// shaky hand all get the same one-step path. `marks` print the reference values under the track (the prudent / neutral /
// bold scenarios, a pension's 60 · 65 · 70), and `info` is what to say ABOUT the value while it moves: it is given the live
// number, so a band label and a reason can follow the thumb.

export type SliderTone = 'prudent' | 'neutral' | 'bold'

export interface SliderMark {
  value: number
  label: string
  /** A scenario mark (prudent · neutral · bold): drawn as a coloured dot on the track and listed in a legend of chips that apply it. */
  tone?: SliderTone
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  valueText,
  onPreview,
  onCommit,
  describedBy,
  marks,
  info,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  /** The words for the current value (« 65 ans »); read by screen readers and shown beside the label. */
  valueText: (v: number) => string
  onPreview?: (v: number) => void
  onCommit: (v: number) => void
  describedBy?: string
  marks?: readonly SliderMark[]
  /** What to say about the live value: a band, a reason. Rendered under the track and follows the thumb. */
  info?: (v: number) => ReactNode
}) {
  const id = useId()
  const t = useT()
  const [local, setLocal] = useState(value)
  const dragging = useRef(false)

  // Follow the stored value (an import, another control's edit) unless the thumb is being held.
  useEffect(() => {
    if (!dragging.current) setLocal(value)
  }, [value])

  const move = (v: number) => {
    dragging.current = true
    setLocal(v)
    onPreview?.(v)
  }
  const end = () => {
    if (!dragging.current) return
    dragging.current = false
    if (local !== value) onCommit(local)
  }
  // The exact step: one tap is a whole gesture, so it commits at once.
  const nudge = (direction: -1 | 1) => {
    const next = Math.min(max, Math.max(min, Math.round((local + direction * step) / step) * step))
    if (next === local) return
    setLocal(next)
    onPreview?.(next)
    onCommit(next)
  }
  const at = (v: number) => (max === min ? 0 : (v - min) / (max - min))
  // Marks that sit close together (prudent 2,5 · neutre 2,1 · audacieux 2,0) would print on top of each other: each one
  // that lands within a fifth of the track of the one before steps down a line.
  const shown = (marks ?? []).filter((m) => m.value >= min && m.value <= max).sort((a, b) => a.value - b.value)
  const lines: number[] = []
  shown.forEach((m, i) => lines.push(i > 0 && at(m.value) - at(shown[i - 1].value) < 0.2 ? (lines[i - 1] + 1) % 3 : 0))
  // Scenario marks (prudent · neutral · bold) are not labelled on the track — three words would collide: each is a coloured
  // dot there, and a legend under the track names it, says its value and applies it in one tap.
  const scenarios = shown.length > 0 && shown.every((m) => m.tone !== undefined)
  const depth = scenarios ? 0 : Math.max(0, ...lines) + 1
  const apply = (v: number) => {
    setLocal(v)
    onPreview?.(v)
    if (v !== value) onCommit(v)
  }

  return (
    <div className="slider">
      <div className="slider__head">
        <label className="field-row__label" htmlFor={id}>
          {label}
        </label>
        <output className="slider__value mono" htmlFor={id}>
          {valueText(local)}
        </output>
      </div>
      <div className="slider__row">
        <button type="button" className="btn btn--icon btn--ghost slider__step" aria-label={`${t.common.less} : ${label}`} disabled={local <= min} onClick={() => nudge(-1)}>
          <Icon name="minus-bold" size={18} />
        </button>
        <div className="slider__track" style={{ ['--lines' as string]: depth }}>
          <input
            id={id}
            className="slider__input"
            type="range"
            min={min}
            max={max}
            step={step}
            value={local}
            aria-valuetext={valueText(local)}
            aria-describedby={describedBy}
            onChange={(e) => move(Number(e.currentTarget.value))}
            onPointerUp={end}
            onKeyUp={end}
            onBlur={end}
          />
          {scenarios && (
            <div className="slider__dots" aria-hidden="true">
              {shown.map((m) => (
                <span key={m.label + m.value} className={`slider__dot tone--${m.tone}`} style={{ ['--at' as string]: at(m.value) }} />
              ))}
            </div>
          )}
          {shown.length > 0 && !scenarios && (
            <div className="slider__marks mono" aria-hidden="true">
              {shown.map((m, i) => (
                <span key={m.label + m.value} className="slider__mark" style={{ ['--at' as string]: at(m.value), ['--line' as string]: lines[i] }}>
                  <span className="slider__tick" />
                  <span className="slider__label">{m.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="btn btn--icon btn--ghost slider__step" aria-label={`${t.common.more} : ${label}`} disabled={local >= max} onClick={() => nudge(1)}>
          <Icon name="plus-bold" size={18} />
        </button>
      </div>
      <div className="slider__ends mono" aria-hidden="true">
        <span>{valueText(min)}</span>
        <span>{valueText(max)}</span>
      </div>
      {scenarios && (
        <div className="slider__legend" role="group" aria-label={label}>
          {/* In the caller's order (prudent · neutral · bold), not the track's: the words keep one reading order everywhere. */}
          {(marks ?? []).filter((m) => m.value >= min && m.value <= max).map((m) => (
            <Chip key={m.label + m.value} radio selected={local === m.value} onClick={() => apply(m.value)} className={`tone tone--${m.tone}`}>
              <span className="tone__dot" aria-hidden="true" />
              {m.label} <span className="mono">{valueText(m.value)}</span>
            </Chip>
          ))}
        </div>
      )}
      {info && <div className="slider__info">{info(local)}</div>}
    </div>
  )
}

import { useEffect, useId, useRef, useState } from 'react'

// A range control for a whole-number choice (an age) whose effect is worth SEEING while it moves.
//
// It owns the position while the thumb is dragged (or a key is held) and reports it twice: `onPreview` on every step —
// cheap, the caller shows what the number would do — and `onCommit` once when the person lets go (pointer up, key up,
// focus leaving), which is when the caller saves it and the heavy answers are recomputed. The number is always readable
// beside the thumb (`valueText`), and the arrow keys move one step, so a slider is never the only way to a value:
// pair it with a NumberField where a precise typed value matters.

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
}) {
  const id = useId()
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
      <div className="slider__ends mono" aria-hidden="true">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

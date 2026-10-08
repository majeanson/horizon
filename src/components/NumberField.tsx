import { useEffect, useId, useRef, useState } from 'react'
import { useLang, useT } from '../i18n'
import { readNumber, showNumber, type NumberKind } from '../lib/numberInput'
import { EditField } from './EditField'
import { StatusMessage } from './StatusMessage'

// The profile's number box: an EditField that owns the TEXT while it is being typed and hands the page a NUMBER
// only when the text means one. Typing is free (« 15 000 », « 812,82 », « 5,25 » all read the FR-CA way, see
// lib/money.ts); the value is committed on Enter or when focus leaves, and an out-of-range or unreadable text is
// kept on screen with a reason instead of being silently replaced — the person sees exactly what was refused.
//
//   money    dollars to the cent, never negative         unit « $ »
//   percent  a fraction stored (0.0525), shown as 5,25   unit « % »
//   decimal  years of service, shares: up to 2 decimals  unit from the `unit` prop
//   year     a whole year, no grouping (« 1978 »)
//   int      a whole number (an age)                     unit from the `unit` prop
//
// `min` / `max` are in the STORED unit (a fraction for percent).

const DEFAULT_UNIT: Record<NumberKind, string> = { money: '$', percent: '%', decimal: '', year: '', int: '' }

interface NumberFieldBase {
  kind: NumberKind
  min?: number
  max?: number
  id?: string
  ariaLabel?: string
  ariaDescribedBy?: string
  /** The unit drawn inside the box, after the text. Defaults by kind. */
  unit?: string
  placeholder?: string
  disabled?: boolean
  /** Forwarded to the box. Only for a field REVEALED by the tap that asked to type (lib/autofocus.test.ts judges the caller). */
  autoFocus?: boolean
}

// Two shapes, so a page never handles a null it cannot receive: a field that `allowEmpty` (an optional figure)
// hands back number | null; every other field hands back a number, and an emptied box means zero (or is refused,
// for a year or an age).
export type NumberFieldProps = NumberFieldBase &
  (
    | { allowEmpty: true; value: number | null; onChange: (value: number | null) => void }
    | { allowEmpty?: false; value: number; onChange: (value: number) => void }
  )

export function NumberField(props: NumberFieldProps) {
  const { kind, min, max, id, ariaLabel, ariaDescribedBy, unit, placeholder, disabled, autoFocus } = props
  const allowEmpty = props.allowEmpty === true
  const value: number | null = props.value
  const onChange = props.onChange as (value: number | null) => void
  const t = useT()
  const { lang } = useLang()
  const [text, setText] = useState(() => showNumber(value, kind, lang))
  const [error, setError] = useState<string | null>(null)
  const typing = useRef(false)
  const errorId = useId()

  // Follow the stored value (an import, a reset, another field's edit) unless the person is mid-typing.
  useEffect(() => {
    if (!typing.current) setText(showNumber(value, kind, lang))
  }, [value, kind, lang])

  const lo = min ?? (kind === 'percent' ? Number.NEGATIVE_INFINITY : 0)
  const hi = max ?? Number.POSITIVE_INFINITY

  const rangeMessage = (): string => {
    const f = (n: number) => (Number.isFinite(n) ? showNumber(n, kind, lang) + (DEFAULT_UNIT[kind] && kind !== 'money' ? ' ' + DEFAULT_UNIT[kind] : '') : '')
    if (Number.isFinite(lo) && Number.isFinite(hi)) return t.fields.range(f(lo), f(hi))
    return t.fields.invalid
  }

  const commit = () => {
    typing.current = false
    if (!text.trim()) {
      if (allowEmpty) {
        setError(null)
        if (value !== null) onChange(null)
        return
      }
      if (kind === 'money' || kind === 'decimal' || kind === 'percent') {
        setError(null)
        setText(showNumber(0, kind, lang))
        if (value !== 0) onChange(0)
        return
      }
      setText(showNumber(value, kind, lang))
      return
    }
    const n = readNumber(text, kind, lo < 0)
    if (n === null) return setError(t.fields.invalid)
    if (n < lo - 1e-9 || n > hi + 1e-9) return setError(rangeMessage())
    setError(null)
    setText(showNumber(n, kind, lang))
    if (n !== value) onChange(n)
  }

  const adornment = unit ?? DEFAULT_UNIT[kind]
  return (
    <>
      <EditField
        as="div"
        value={text}
        onChange={(v) => {
          typing.current = true
          setError(null)
          setText(v)
        }}
        onSubmit={commit}
        onBlur={commit}
        allowEmpty
        submitIcon={null}
        id={id}
        ariaLabel={ariaLabel}
        ariaDescribedBy={[ariaDescribedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined}
        inputMode={kind === 'year' || kind === 'int' ? 'numeric' : 'decimal'}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        boxActions={adornment ? <span className="num-unit mono" aria-hidden="true">{adornment}</span> : undefined}
      />
      {error && (
        <span id={errorId}>
          <StatusMessage tone="error">{error}</StatusMessage>
        </span>
      )}
    </>
  )
}

import { useEffect, useId, useRef, useState } from 'react'
import { useLang, useT } from '../i18n'
import { emptyValue, readNumber, showNumber, stepped, type NumberKind } from '../lib/numberInput'
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
//
// The keyboard helps a figure along: Escape gives back the stored text (and drops a refusal), ↑ / ↓ step the figure by what suits its size and commit at
// once (Shift ten steps; lib/numberInput.ts `stepped`), and a kept change rings the box once in the success hue (`saved`, styles/motion.css). The phone's return
// key reads « OK », and the browser's autofill and spell-check stay off a number.
//
// Focus makes typing easy: the box's text is selected whole, so the first digit REPLACES it — a plain 0 (the default of every optional
// amount) never ends up as « 0150 ». (Emptying a zero on focus was tried: the clear ✕ appears with the first digit and shifts the tab order.)

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
  // A kept change rings the box for a beat. A counter, not a flag: two commits in a row each ring (the class is dropped between them by the timer's reset).
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(savedTimer.current), [])
  const ring = () => {
    clearTimeout(savedTimer.current)
    setSaved(true)
    savedTimer.current = setTimeout(() => setSaved(false), 900)
  }

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
      // An emptied amount is 0 — only where 0 is allowed (lib/numberInput.ts `emptyValue`); else the box goes back to its figure, as a year's does.
      if (emptyValue(kind, lo, hi) === 0) {
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
    if (n !== value) {
      onChange(n)
      ring()
    }
  }

  // ↑ / ↓: step from what is in the box when it reads as a number (else from the stored figure), keep the result at once.
  const arrow = (dir: 1 | -1, fast: boolean) => {
    const typed = text.trim() ? readNumber(text, kind, lo < 0) : null
    const next = stepped(typed ?? value, kind, dir, fast, lo, hi)
    typing.current = false
    setError(null)
    setText(showNumber(next, kind, lang))
    if (next !== value) {
      onChange(next)
      ring()
    }
  }

  // Escape: back to the stored text. Only offered while there is something to give back, so an Escape on a clean box still reaches a dialog around it.
  const revert = () => {
    typing.current = false
    setError(null)
    setText(showNumber(value, kind, lang))
  }
  const dirty = error !== null || text !== showNumber(value, kind, lang)

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
        selectOnFocus
        allowEmpty
        submitIcon={null}
        id={id}
        ariaLabel={ariaLabel}
        ariaDescribedBy={[ariaDescribedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined}
        inputMode={kind === 'year' || kind === 'int' ? 'numeric' : 'decimal'}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        invalid={error !== null}
        saved={saved && error === null}
        onEscape={dirty ? revert : undefined}
        onArrow={disabled ? undefined : arrow}
        enterKeyHint="done"
        plain
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

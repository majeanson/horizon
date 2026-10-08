import { useEffect, useRef, type ReactNode } from 'react'
import { useT } from '../i18n'
import { revealOnOpen } from '../lib/motion'
import { Icon, type IconName } from './Icon'

// The ONE text box. Every "type something, then act on it" spot hand-rolled an input + a
// clear ✕ + a submit + a cancel, each with its own wrapper class, and on a phone they
// stacked into a tall column of full-width buttons. EditField folds the clear INSIDE the
// field box and keeps the actions compact, then grows per case via props (a leading glyph,
// a trailing unit, picker menus as children).
//
// The explicit submit is optional. Enter always commits (native form submit); a field with
// no rival action can also commit on blur (commitOnBlur) and hide the button entirely
// (submitIcon={null}). `NumberField` (the profile's amounts) is the main consumer: it owns
// the text, parses it on blur, and passes `onBlur` instead of using the submit at all.

export interface EditFieldProps {
  value: string
  onChange: (v: string) => void
  /** Fired by Enter, the submit button, and (when commitOnBlur) focus-out. Gets the raw value. */
  onSubmit?: (v: string) => void
  /** Provide → a labeled submit button. Omit → an icon-only ✓ (unless submitIcon is null). */
  submitLabel?: string
  /** Icon for the icon-only submit. Pass null to hide the submit button entirely (Enter/blur only). */
  submitIcon?: IconName | null
  /** Commit when focus leaves the field (and the form). Default false. Skips empty/whitespace. */
  commitOnBlur?: boolean
  /** Plain focus-out notification, for a host that parses the text itself. */
  onBlur?: () => void
  /** Renders a compact ✕ cancel at the row end. */
  onCancel?: () => void
  /** Inline ✕ inside the box while the value is non-empty. Default true. */
  clearable?: boolean
  /** A quiet glyph INSIDE the box, left of the text. Decorative — the aria-label carries the meaning. */
  leadingIcon?: IconName
  /** Extra affordances INSIDE the box, after the clear ✕ — e.g. a unit (« $ », « % »). */
  boxActions?: ReactNode
  /** Commit even when the text is empty. The HOST must then reject a truly empty submit. */
  allowEmpty?: boolean
  placeholder?: string
  ariaLabel?: string
  ariaDescribedBy?: string
  id?: string
  inputMode?: 'text' | 'decimal' | 'numeric' | 'search'
  autoFocus?: boolean
  /** Disables the whole field (input + buttons). */
  disabled?: boolean
  maxLength?: number
  /** Render a textarea instead of an input. Enter then inserts a newline (no submit). */
  multiline?: boolean
  /** Starting height of a `multiline` field, in lines. A textarea does not grow with its content. */
  rows?: number
  /** Left of the field: an icon picker button or a drag handle. */
  leading?: ReactNode
  /** A custom action rendered right after the submit. Keep it compact. */
  trailing?: ReactNode
  /** Picker menus etc., rendered after the field block. */
  children?: ReactNode
  className?: string
  /** Render as a `<form>` (default; owns native submit) or a plain `<div>` to embed inside a
   *  larger composite `<form>` — nesting `<form>` is invalid HTML. In 'div' mode Enter commits
   *  via onKeyDown and the submit buttons become `type="button"`. */
  as?: 'form' | 'div'
}

export function EditField({
  value,
  onChange,
  onSubmit,
  submitLabel,
  submitIcon = 'check-bold',
  commitOnBlur = false,
  onBlur,
  onCancel,
  clearable = true,
  leadingIcon,
  boxActions,
  allowEmpty = false,
  placeholder,
  ariaLabel,
  ariaDescribedBy,
  id,
  inputMode,
  autoFocus,
  disabled,
  maxLength,
  multiline,
  rows,
  leading,
  trailing,
  children,
  className,
  as = 'form',
}: EditFieldProps) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  // A field that auto-focuses is a field someone just OPENED. Bring it on screen if it
  // is not; `block: 'nearest'` means an already-visible field never moves.
  useEffect(() => (autoFocus ? revealOnOpen(inputRef.current) : undefined), [autoFocus])
  const isForm = as === 'form'

  const commit = () => {
    if (!onSubmit || disabled) return
    if (!value.trim() && !allowEmpty) return
    onSubmit(value)
  }

  // Enter (or the submit button) commits via the native form. In a textarea Enter makes a
  // newline instead — the browser never fires submit.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    commit()
  }

  // In div mode there is no native form submit; route Enter → commit ourselves.
  // preventDefault() also cancels the host composite <form>'s implicit submit.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Mid-IME-composition Enter confirms the composition, not the field.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (isForm || multiline) return
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
  }

  // Commit on focus-out only when the focus is actually leaving the field — not when it
  // hops to the cancel button in the SAME field (which would commit-then-cancel).
  const handleBlur = (e: React.FocusEvent) => {
    onBlur?.()
    if (!commitOnBlur || !value.trim()) return
    const next = e.relatedTarget as Node | null
    if (next && e.currentTarget.closest('.edit-field')?.contains(next)) return
    commit()
  }

  const clear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  const showIconSubmit = !submitLabel && submitIcon != null && !!onSubmit
  const submitDisabled = disabled || (!value.trim() && !allowEmpty)

  // A LABELED submit is what makes a row a composer rather than a bare field — and the one
  // thing that can squeeze the text off the line. The modifier lets fields.css give it its
  // own full-width line under a narrow container. An icon-only ✓ never gets it.
  const rootClass = 'edit-field' + (submitLabel ? ' edit-field--cta' : '') + (className ? ` ${className}` : '')
  const common = {
    id,
    className: 'input edit-field__input',
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onBlur: handleBlur,
    placeholder,
    // The placeholder names the box only when nothing else can: a box with an `id` has a <label for> pointing at it,
    // and an aria-label would silence that label (« Année de naissance » read as « ex. 1975 » to a screen reader).
    'aria-label': ariaLabel ?? (id ? undefined : placeholder),
    'aria-describedby': ariaDescribedBy,
    autoFocus,
    disabled,
    maxLength,
  }
  const body = (
    <>
      <div className="edit-field__row">
        {leading}
        <div className="edit-field__box">
          {leadingIcon && (
            <span className="edit-field__lead" aria-hidden="true">
              <Icon name={leadingIcon} size={20} />
            </span>
          )}
          {multiline ? (
            <textarea ref={inputRef as React.Ref<HTMLTextAreaElement>} rows={rows} {...common} />
          ) : (
            <input ref={inputRef as React.Ref<HTMLInputElement>} inputMode={inputMode} onKeyDown={handleKeyDown} {...common} />
          )}
          {clearable && value && !disabled && (
            <button
              type="button"
              className="edit-field__icon-btn"
              onClick={clear}
              aria-label={t.common.clear}
              title={t.common.clear}
            >
              <Icon name="x-bold" size={15} />
            </button>
          )}
          {boxActions}
        </div>

        {submitLabel && (
          <button
            type={isForm ? 'submit' : 'button'}
            onClick={isForm ? undefined : commit}
            className="btn btn--sm edit-field__submit"
            disabled={submitDisabled}
          >
            {submitLabel}
          </button>
        )}
        {showIconSubmit && (
          <button
            type={isForm ? 'submit' : 'button'}
            onClick={isForm ? undefined : commit}
            className="edit-field__icon-btn edit-field__submit"
            disabled={submitDisabled}
            aria-label={t.common.save}
          >
            <Icon name={submitIcon} size={17} />
          </button>
        )}

        {trailing}

        {onCancel && (
          <button
            type="button"
            className="edit-field__icon-btn"
            onClick={onCancel}
            aria-label={t.common.cancel}
            title={t.common.cancel}
          >
            <Icon name="x-bold" size={16} />
          </button>
        )}
      </div>
      {children}
    </>
  )

  // <form> owns native submit (Enter/button); <div> embeds inside a host form and commits via
  // onKeyDown / button onClick instead (no nested <form>).
  return isForm ? (
    <form className={rootClass} onSubmit={handleSubmit}>
      {body}
    </form>
  ) : (
    <div className={rootClass}>{body}</div>
  )
}

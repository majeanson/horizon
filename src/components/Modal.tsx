import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModal } from '../lib/useModal'
import { useT } from '../i18n'
import { Icon } from './Icon'

// A centred dialog wrapper: one place that wires the shared modal behaviour
// (Escape, scroll-lock, focus-trap via useModal), the backdrop, and the ✕ close,
// so the dozen hand-rolled overlays stop drifting. Mount it conditionally and pass
// `open` — `{!open ⇒ null}`. Backdrop click and ✕ both close. Portalled to <body>
// so it escapes any transformed ancestor.
export function Modal({
  open,
  onClose,
  title,
  ariaLabel,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  /** The dialog's name when there is no visible `title` — a dialog must never be nameless to a screen reader. */
  ariaLabel?: string
  children: ReactNode
  className?: string
}) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useModal(ref, onClose, { open })
  if (!open) return null
  return createPortal(
    <div className="kit-modal__backdrop" onClick={onClose}>
      <div
        ref={ref}
        className={'kit-modal' + (className ? ` ${className}` : '')}
        role="dialog"
        aria-modal="true"
        // The visible title IS the accessible name (the confirm dialog already does this);
        // without the link a screen reader announced an unnamed dialog.
        aria-labelledby={title != null ? titleId : undefined}
        aria-label={title == null ? ariaLabel : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="kit-modal__close" onClick={onClose} aria-label={t.common.close} title={t.common.close}>
          <Icon name="x-bold" size={18} />
        </button>
        {title != null && (
          <h3 id={titleId} className="kit-modal__title">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

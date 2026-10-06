import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import { useModal } from './useModal'
import { Icon } from '../components/Icon'

// A real in-app confirm dialog — replaces the platform `window.confirm()` (ugly, unstyled,
// blocks the JS thread, invisible to e2e) for the few HEAVY, irreversible actions: erasing
// the whole profile, importing a file over the one on this device.
//
// Promise-based so a caller reads naturally:
//   const confirm = useConfirm()
//   if (!(await confirm({ message, tone: 'danger' }))) return
//
// The message must say WHAT IS LOST, never a bare « Supprimer ? » — e.g. « Effacer tout ?
// Le profil et les hypothèses seront retirés de cet appareil ; sans export, rien ne les
// ramène. » (src/lib/confirmCopy.test.ts holds every `…Confirm` string to that rule.)
//
// One <ConfirmProvider> mounts at the app root; only one dialog is ever open.
interface ConfirmOpts {
  message: string
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  // 'danger' tints the confirm button as a destructive action (the default, since the
  // usual caller is a delete); 'default' for a neutral choice.
  tone?: 'danger' | 'default'
}

const ConfirmContext = createContext<(opts: ConfirmOpts) => Promise<boolean>>(() => Promise.resolve(false))

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useT()
  const [req, setReq] = useState<ConfirmOpts | null>(null)
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const settle = useCallback((ok: boolean) => {
    resolverRef.current?.(ok)
    resolverRef.current = null
    setReq(null)
  }, [])

  // Esc / scroll-lock / focus-trap; Esc resolves to "no" (same as Cancel).
  const cancel = useCallback(() => settle(false), [settle])
  useModal(dialogRef, cancel, { open: !!req })

  const confirm = useCallback((opts: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setReq(opts)
    })
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {req && (
        <>
          <div className="confirm-backdrop" onClick={cancel} aria-hidden="true" />
          <div ref={dialogRef} className="confirm" role="alertdialog" aria-modal="true" aria-label={req.title ?? t.common.confirmTitle}>
            <p className="confirm__msg">{req.message}</p>
            <div className="confirm__actions">
              <button type="button" className="btn btn--ghost" onClick={cancel}>
                {req.cancelLabel ?? t.common.cancel}
              </button>
              <button
                type="button"
                className={'btn' + (req.tone === 'default' ? ' btn--primary' : ' btn--danger')}
                onClick={() => settle(true)}
              >
                {req.tone !== 'default' && <Icon name="trash-bold" size={16} />}
                {req.confirmLabel ?? t.common.delete}
              </button>
            </div>
          </div>
        </>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)

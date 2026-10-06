import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

// A small, calm notice line: one message at a time, announced politely, gone by itself.
// It confirms an action that has no other visible result (« Profil exporté », « Fichier
// importé »). It never carries a decision — that is useConfirm's job — and it never
// stacks, blinks or animates beyond a fade: a planner that nags is a planner that is closed.
interface Notice {
  id: number
  message: string
  tone: 'info' | 'error'
}

const NOTICE_MS = 4000

const ToastContext = createContext<(message: string, tone?: Notice['tone']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null)
  const nextId = useRef(1)
  const timer = useRef<number | null>(null)

  const show = useCallback((message: string, tone: Notice['tone'] = 'info') => {
    if (timer.current != null) window.clearTimeout(timer.current)
    const id = nextId.current++
    setNotice({ id, message, tone })
    timer.current = window.setTimeout(() => {
      setNotice((cur) => (cur?.id === id ? null : cur))
    }, NOTICE_MS)
  }, [])

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current)
    },
    [],
  )

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* The live region is always mounted: a region inserted together with its text is
          often not announced, one that already exists and then changes is. */}
      <div className="toast-region" role="status" aria-live="polite">
        {notice && (
          <p key={notice.id} className={'toast toast--' + notice.tone}>
            {notice.message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export const useNotice = () => useContext(ToastContext)

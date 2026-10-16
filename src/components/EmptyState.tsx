import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

// The ONE "nothing here, and that's fine" line. Empty states were scattered across several
// class names; this is the calm default — a quiet, balanced line, never a stray dash or an
// alarm. `tone='calm'` adds a touch more breathing room for the deliberate case.
// `icon` adds a soft disc with a glyph before the words (the page's subject, never an alarm):
// an empty page with a picture reads as « not yet », not as « broken ». Decorative — the words
// carry the meaning.
// role='status' so a screen reader announces it when a list empties.
export function EmptyState({
  children,
  tone = 'plain',
  icon,
  className,
}: {
  children: ReactNode
  tone?: 'plain' | 'calm'
  icon?: IconName
  className?: string
}) {
  return (
    <p className={'empty-state' + (tone === 'calm' ? ' empty-state--calm' : '') + (icon ? ' empty-state--icon' : '') + (className ? ` ${className}` : '')} role="status">
      {icon && (
        <span className="empty-state__mark" aria-hidden="true">
          <Icon name={icon} size={22} />
        </span>
      )}
      {children}
    </p>
  )
}

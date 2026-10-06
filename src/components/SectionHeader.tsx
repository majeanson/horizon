import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

// A small section header: an optional icon, a title, an optional subtitle, and an optional
// trailing action. One anatomy for every section of the profile and the results.
// Presentational — pass an already-translated title.
export function SectionHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: IconName
  action?: ReactNode
}) {
  return (
    <div className="section-header">
      <div className="section-header__main">
        {icon && <Icon name={icon} size={18} />}
        <span className="section-header__text">
          <span className="section-header__title">{title}</span>
          {subtitle != null && <span className="section-header__sub mono">{subtitle}</span>}
        </span>
      </div>
      {action && <div className="section-header__action">{action}</div>}
    </div>
  )
}

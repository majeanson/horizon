import { Link } from 'react-router-dom'
import type { Lang } from '../../i18n'
import { RPG_COPY } from '../../lib/rpgCopy'
import type { SheetModel, SlotKind, StatId } from '../../lib/sheetModel'
import { sheetView } from '../../lib/sheetView'
import { Icon, type IconName } from '../Icon'
import { StatBar } from './StatBar'

// The character sheet, « Aventure » skin: the same household drawn as a role-playing character sheet — a framed banner with the party and its level, the five
// attributes as gauges with an icon each, the equipment as tiles, the quests as a scroll, the feats as badges. It draws the SAME sheet view as the serious skin
// (lib/sheetView.ts): the figures are already text there, so this file formats no number; only the words (lib/rpgCopy.ts), the layout and the icons are its own.
// Icons are the app's own (Phosphor, never an emoji). Nothing here ever says a figure is bad: a short gauge is room to grow.

const STAT_ICON: Record<StatId, IconName> = {
  runway: 'calendar-blank-bold',
  cover: 'bank-bold',
  saving: 'piggy-bank-bold',
  keep: 'lock-bold',
  resilience: 'chart-line-up-bold',
}
const SLOT_ICON: Record<SlotKind, IconName> = {
  rrsp: 'piggy-bank-bold',
  tfsa: 'piggy-bank-bold',
  nonReg: 'bank-bold',
  pension: 'identification-card-bold',
  home: 'house-bold',
}

export function SheetRpg({ model, lang, births, names }: { model: SheetModel; lang: Lang; births: readonly number[]; names: readonly string[] }) {
  const v = sheetView(model, lang, RPG_COPY[lang], births, names)
  return (
    <div className="sheet sheet--rpg">
      <header className="sheet-rpg__banner">
        <div className="sheet-rpg__crest" aria-hidden="true">
          <Icon name={model.couple ? 'users-three-bold' : 'user-bold'} size={36} />
        </div>
        <div className="sheet-rpg__banner-text">
          <h2 className="sheet-rpg__title">{v.title}</h2>
          <p className="sheet-rpg__party">{v.party}</p>
          <p className="field-row__hint">{v.intro}</p>
        </div>
        <div className="sheet-rpg__level" title={v.level.hint}>
          <span className="sheet-rpg__level-label">{v.level.label}</span>
          <span className="sheet-rpg__level-value">{v.level.text}</span>
        </div>
      </header>
      {v.empty !== null && (
        <div className="surface sheet__empty">
          <p>{v.empty}</p>
          <Link className="btn btn--primary btn--sm" to="/profil">
            {v.toProfile}
          </Link>
        </div>
      )}

      <ul className="sheet-rpg__heroes">
        {v.heroes.map((h) => (
          <li key={h.id} className="sheet-rpg__hero">
            <p className="sheet-rpg__hero-name">{h.name}</p>
            <p className="sheet-rpg__hero-class">{h.className}</p>
            <p className="field-row__hint">{h.line}</p>
          </li>
        ))}
      </ul>

      <ul className="sheet-rpg__stats">
        {v.stats.map((s) => (
          <li key={s.id} className="sheet-rpg__stat">
            <span className="sheet-rpg__stat-icon" aria-hidden="true">
              <Icon name={STAT_ICON[s.id]} size={22} />
            </span>
            <div className="sheet-rpg__stat-body">
              <div className="sheet__stat-head">
                <p className="sheet-rpg__stat-name">{s.name}</p>
                <p className="sheet__stat-value mono">{s.valueText}</p>
              </div>
              <StatBar name={s.name} percent={s.percent} valueText={s.valueText} />
              <p className="field-row__hint">{s.hint}</p>
              {s.detail && <p className="sheet__stat-detail">{s.detail}</p>}
              <p className="field-row__hint sheet__scale">{s.scaleText}</p>
            </div>
          </li>
        ))}
      </ul>

      <section className="sheet-rpg__panel" aria-label={v.slots.title}>
        <h2 className="sheet-rpg__panel-title">{v.slots.title}</h2>
        {v.slots.items.length === 0 ? (
          <p className="field-row__hint">{v.slots.empty}</p>
        ) : (
          <ul className="sheet-rpg__slots">
            {v.slots.items.map((s) => (
              <li key={s.key} className="sheet-rpg__slot">
                <span className="sheet-rpg__slot-icon" aria-hidden="true">
                  <Icon name={SLOT_ICON[s.kind]} size={22} />
                </span>
                <p className="sheet-rpg__slot-title">{s.title}</p>
                <p className="field-row__hint">{s.owner}</p>
                {s.amountText !== null && <p className="sheet__slot-amount mono">{s.amountText}</p>}
                {s.note && <p className="field-row__hint">{s.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="sheet-rpg__panel" aria-label={v.quests.title}>
        <h2 className="sheet-rpg__panel-title">{v.quests.title}</h2>
        <p className="field-row__hint">{v.quests.intro}</p>
        <ul className="sheet__quests">
          {v.quests.items.map((q) => (
            <li key={q.key} className="sheet__quest">
              <Link to={q.to} className="info-note__link">
                {q.text}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="sheet-rpg__panel" aria-label={v.achievements.title}>
        <h2 className="sheet-rpg__panel-title">{v.achievements.title}</h2>
        <ul className="sheet-rpg__feats">
          {v.achievements.items.map((a) => (
            <li key={a.id} className={'sheet-rpg__feat' + (a.earned ? ' is-earned' : '')}>
              <span className="sheet-rpg__feat-mark" aria-hidden="true">
                <Icon name={a.earned ? 'check-bold' : 'lock-bold'} size={18} />
              </span>
              <p className="sheet-rpg__feat-name">{a.name}</p>
              <p className="field-row__hint">{a.hint}</p>
              <p className="sheet__feat-status">{a.status}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="field-row__hint">{v.accuracy.text}</p>
      <Link className="btn btn--ghost btn--sm" to="/resultats">
        {v.toResults}
      </Link>
    </div>
  )
}

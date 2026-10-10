import { Link } from 'react-router-dom'
import type { Lang } from '../../i18n'
import { SHEET_COPY } from '../../lib/sheetCopy'
import type { SheetModel } from '../../lib/sheetModel'
import { sheetView } from '../../lib/sheetView'
import { SectionHeader } from '../SectionHeader'
import { StatBar } from './StatBar'

// The character sheet, serious skin: a clean page of cards. It draws the SHEET VIEW (lib/sheetView.ts) and nothing else: every figure is already text there,
// so this file formats no number — the guard in lib/sheetSkins.test.ts keeps it that way — and the adventure skin draws the very same view.
export function SheetSerious({ model, lang, births, names }: { model: SheetModel; lang: Lang; births: readonly number[]; names: readonly string[] }) {
  const v = sheetView(model, lang, SHEET_COPY[lang], births, names)
  return (
    <div className="sheet sheet--serious">
      <p className="page-head__sub">{v.intro}</p>
      {v.empty !== null && (
        <div className="surface sheet__empty">
          <p>{v.empty}</p>
          <Link className="btn btn--primary btn--sm" to="/profil">
            {v.toProfile}
          </Link>
        </div>
      )}

      <section className="sheet__section" aria-label={v.party}>
        <SectionHeader title={v.party} />
        <ul className="sheet__heroes">
          {v.heroes.map((h) => (
            <li key={h.id} className="surface sheet__hero">
              <p className="sheet__hero-name">{h.name}</p>
              <p className="sheet__hero-class">{h.className}</p>
              <p className="field-row__hint">{h.line}</p>
            </li>
          ))}
          <li className="surface sheet__hero sheet__level" title={v.level.hint}>
            <p className="sheet__hero-class">{v.level.label}</p>
            <p className="sheet__level-value">{v.level.text}</p>
            <p className="field-row__hint">{v.level.hint}</p>
          </li>
        </ul>
        <ul className="sheet__stats">
          {v.stats.map((s) => (
            <li key={s.id} className="surface sheet__stat">
              <div className="sheet__stat-head">
                <p className="sheet__stat-name">{s.name}</p>
                <p className="sheet__stat-value mono">{s.valueText}</p>
              </div>
              <StatBar name={s.name} percent={s.percent} valueText={s.valueText} />
              <p className="field-row__hint">{s.hint}</p>
              {s.detail && <p className="sheet__stat-detail">{s.detail}</p>}
              <p className="field-row__hint sheet__scale">{s.scaleText}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="sheet__section" aria-label={v.slots.title}>
        <SectionHeader title={v.slots.title} />
        {v.slots.items.length === 0 ? (
          <p className="field-row__hint">{v.slots.empty}</p>
        ) : (
          <ul className="sheet__slots">
            {v.slots.items.map((s) => (
              <li key={s.key} className="surface sheet__slot">
                <p className="sheet__slot-title">{s.title}</p>
                <p className="field-row__hint">{s.owner}</p>
                {s.amountText !== null && <p className="sheet__slot-amount mono">{s.amountText}</p>}
                {s.note && <p className="field-row__hint">{s.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="sheet__section" aria-label={v.quests.title}>
        <SectionHeader title={v.quests.title} subtitle={v.quests.intro} />
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

      <section className="sheet__section" aria-label={v.achievements.title}>
        <SectionHeader title={v.achievements.title} />
        <ul className="sheet__feats">
          {v.achievements.items.map((a) => (
            <li key={a.id} className={'surface sheet__feat' + (a.earned ? ' is-earned' : '')}>
              <p className="sheet__feat-name">{a.name}</p>
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

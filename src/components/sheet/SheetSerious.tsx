import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Lang } from '../../i18n'
import { SHEET_COPY } from '../../lib/sheetCopy'
import type { SheetModel } from '../../lib/sheetModel'
import { sheetView, type StatView } from '../../lib/sheetView'
import { Chip } from '../Chip'
import { ConceptPip } from '../ConceptPip'
import { Fold } from '../Fold'
import { Cluster } from '../Layout'
import { SectionHeader, SectionLevel } from '../SectionHeader'
import { StatBar } from './StatBar'

// The household sheet: a clean page of cards. It draws the SHEET VIEW (lib/sheetView.ts) and nothing else: every figure is already text there, so this file
// formats no number — the guard in lib/sheetSkins.test.ts keeps it that way. The order is the order of the reader's questions: can we stop, and how sure
// is that (the verdict) · when (the plan's line, handed in) · what does life look like today and once retired · what is it standing on · what would
// make it surer. Every card that holds a figure of the profile leads to the field that changes it.

/** One measure: its figure, its bar, one line of what it is read from — and, folded away, what the measure means and what a full bar stands for. */
function StatCard({ s, howToRead }: { s: StatView; howToRead: string }) {
  return (
    <li className="surface sheet__stat">
      <div className="sheet__stat-head">
        <p className="sheet__stat-name">{s.name}</p>
        <p className="sheet__stat-value mono">{s.valueText}</p>
      </div>
      <StatBar name={s.name} percent={s.percent} valueText={s.valueText} />
      {s.detail && <p className="sheet__stat-detail">{s.detail}</p>}
      <Fold summary={howToRead}>
        <p className="field-row__hint">{s.hint}</p>
        <p className="field-row__hint sheet__scale">{s.scaleText}</p>
      </Fold>
    </li>
  )
}

export function SheetSerious({ model, lang, births, names, timeline, cards }: { model: SheetModel; lang: Lang; births: readonly number[]; names: readonly string[]; timeline?: ReactNode; cards?: ReactNode }) {
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

      <section className="sheet__section" aria-label={v.verdict.title}>
        <SectionHeader title={v.verdict.title} concept="reponse" />
        <ul className="sheet__stats">
          {v.verdict.stats.map((s) => (
            <StatCard key={s.id} s={s} howToRead={v.howToRead} />
          ))}
        </ul>
        <p className="field-row__hint">{v.verdict.accuracy}</p>
        <Link className="btn btn--ghost btn--sm" to="/resultats">
          {v.verdict.toResults}
        </Link>
      </section>

      {timeline}

      {v.groups.map((g) => (
        <section key={g.id} className="sheet__section" aria-label={g.title}>
          <SectionHeader title={g.title} subtitle={g.hint} concept={g.id === 'today' ? 'budget' : 'depart'} />
          <ul className="sheet__stats">
            {g.stats.map((s) => (
              <StatCard key={s.id} s={s} howToRead={v.howToRead} />
            ))}
          </ul>
        </section>
      ))}

      <section className="sheet__section" aria-label={v.holdings.title}>
        <SectionHeader title={v.holdings.title} concept="nid" />
        {v.holdings.groups.length === 0 && <p className="field-row__hint">{v.holdings.empty}</p>}
        <SectionLevel.Provider value={3}>
          {v.holdings.groups.map((g) => (
            <div key={g.id} className="sheet__group">
              <SectionHeader title={g.title} subtitle={g.totalText ?? undefined} concept={g.id === 'investable' ? 'nid' : g.id === 'pension' ? 'employeur' : 'maison'} />
              {g.note && <p className="field-row__hint">{g.note}</p>}
              <ul className="sheet__slots">
                {g.items.map((s) => (
                  <li key={s.key} className="surface sheet__slot">
                    <Link className="sheet__slot-title" to={s.to} aria-label={s.editLabel}>
                      {s.title}
                    </Link>
                    <p className="field-row__hint">{s.owner}</p>
                    {s.amountText !== null && <p className="sheet__slot-amount mono">{s.amountText}</p>}
                    {s.shareText !== null && <p className="field-row__hint">{s.shareText}</p>}
                    {s.extra && <p className="field-row__hint">{s.extra}</p>}
                    {s.note && <p className="field-row__hint">{s.note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {v.holdings.rooms.length > 0 && (
            <div className="sheet__group">
              <SectionHeader title={v.holdings.roomTitle} concept="droits" />
              <ul className="sheet__rooms">
                {v.holdings.rooms.map((r) => (
                  <li key={r.key}>
                    <Link to={r.to} className="info-note__link">
                      {r.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionLevel.Provider>
        {v.holdings.tags.length > 0 && (
          <Cluster>
            {v.holdings.tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </Cluster>
        )}
      </section>

      {/* What the profile says about the household, read here and not among the fields: the cash buffer, what the children cost (pages/Fiche.tsx hands them in). */}
      {cards}

      {v.sharpen !== null && (
        <section className="sheet__section" aria-label={v.sharpen.title}>
          <SectionHeader title={v.sharpen.title} subtitle={v.sharpen.intro} concept="precision" />
          <p className="field-row__hint">{v.sharpen.note}</p>
          {v.sharpen.items.length > 0 && (
            <ul className="sheet__movers">
              {v.sharpen.items.map((m) => (
                <li key={m.key} className="surface sheet__mover">
                  <ConceptPip id={m.concept} size="sm" />
                  <Link className="sheet__mover-name info-note__link" to={m.to}>
                    {m.name}
                  </Link>
                  <span className="mono">{m.swingText}</span>
                </li>
              ))}
            </ul>
          )}
          {v.sharpen.absent.length > 0 && (
            <>
              <p className="verdict__range-title">{v.sharpen.absentTitle}</p>
              <ul className="refine__list">
                {v.sharpen.absent.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  )
}

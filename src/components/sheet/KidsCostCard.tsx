import { CHILD_COSTS, CPI_ANNUAL } from '../../engine/params/childCosts'
import { pageFor } from '../../engine/params/twins'
import { childStage } from '../../engine/lifeEvents'
import { useLang, useT } from '../../i18n'
import { DEFAULT_LEAVE_AGE, suggestChildCost } from '../../lib/kidsCost'
import { KIDS_COPY } from '../../lib/kidsCopy'
import { kidsSummary, leaveSummary } from '../../lib/kidsSummary'
import { formatMoney } from '../../lib/money'
import type { Profile } from '../../lib/schema'
import { today } from '../../lib/today'
import { Fold } from '../Fold'
import { SectionHeader } from '../SectionHeader'

// « Ce que coûtent les enfants » on the sheet: what Statistics Canada says a family like this one spends per child, by the child's age, what the state pays back, what a
// parental leave costs in pay — said in plain numbers, an ESTIMATE, never put over a figure the person typed. It used to sit among the fields of the Famille card on
// Profil; the choices that ACT on it (use these amounts, count the benefits, take a leave) stay there, and this is where the numbers are READ. Where they come from
// (the method, the pages) is one tap away. Shown once there is a child at home or one still to come.
const SOURCES = [CHILD_COSTS, CPI_ANNUAL].map((x) => x.source)

export function KidsCostCard({ profile }: { profile: Profile }) {
  const { lang } = useLang()
  const t = useT()
  const k = KIDS_COPY[lang]
  const c = k.cost
  const b = k.benefits
  const now = today()
  const cost = profile.household.childSpending ?? null
  const untilAge = cost?.untilAge ?? DEFAULT_LEAVE_AGE
  const stages = (profile.household.children ?? []).map((y) => childStage(y, now.year, untilAge))
  const hasHome = stages.includes('home')
  const hasFuture = stages.includes('future')
  const s = suggestChildCost(profile, now.year)
  if (s === null || (!hasFuture && !hasHome)) return null
  const money = (n: number) => formatMoney(n, lang)
  const summary = kidsSummary(profile, now.year)
  const lines = leaveSummary(profile, now.year)
  const nameOf = (id: 'self' | 'spouse') => profile.household.persons.find((x) => x.id === id)?.name.trim() || (id === 'self' ? t.profile.self : t.profile.spouse)
  return (
    <section id="enfants" className="sheet__section" aria-label={c.title}>
      <SectionHeader title={c.title} subtitle={c.lead(c.families[s.family], c.levels[s.level], s.children)} concept="enfants" />
      <ul className="kids-cost__bands">
        {s.bands.map((band, i) => (
          <li key={c.bands[i]}>{c.bandLine(c.bands[i], money(band))}</li>
        ))}
      </ul>
      {hasHome && s.perChildNow !== null && <p className="field-row__hint">{c.nowHint(money(s.perChildNow))}</p>}
      {summary && (
        <div className="kids-benefits">
          <p className="kids-cost__title">
            <strong>{b.title}</strong> <span className="mono">({c.estimated})</span>
          </p>
          {summary.atHome && <p>{b.atHome(summary.atHome.children, money(Math.round(summary.atHome.cost)), money(Math.round(summary.atHome.benefit)), money(Math.round(summary.atHome.net)))}</p>}
          {summary.planned && (
            <p>{b.planned(String(summary.planned.born), money(Math.round(summary.planned.cost)), money(Math.round(summary.planned.benefit)), money(Math.round(summary.planned.net)), money(Math.round(summary.planned.lifetime)))}</p>
          )}
          <p className="field-row__hint">{b.note}</p>
        </div>
      )}
      {lines?.map((l) => (l.weeks > 0 ? <p key={l.person}>{k.leave.line(nameOf(l.person), l.weeks, money(Math.round(l.lostPay)), money(Math.round(l.benefit)))}</p> : null))}
      <Fold summary={k.how.open}>
        <div className="kids-cost__how">
          <ul>
            {k.how.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="field-row__hint">{k.how.sources}</p>
          <ul className="kids-cost__sources">
            {SOURCES.map((src) => {
              const page = pageFor(src, lang)
              return (
                <li key={src.url}>
                  <a className="info-note__link" href={page.url} target="_blank" rel="noopener noreferrer">
                    {page.title}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      </Fold>
    </section>
  )
}

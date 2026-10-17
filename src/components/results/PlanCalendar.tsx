import type { Household } from '../../engine/types'
import { useLang } from '../../i18n'
import { formatYearAge } from '../../lib/format'
import { calendarByYear, planCalendar } from '../../lib/planCalendar'
import { calendarLine, PLAN_CALENDAR_COPY } from '../../lib/planCalendarCopy'
import { Fold } from '../Fold'

// « Les dates de votre plan » — the dates the profile announces, one line per year, each year with the ages it brings. The sister of the plan's line (TimelineStrip), in words: what the line
// draws as stretches, this tells as a list, with the dates the line does not carry (a child leaving, the mortgage paid off, a flow beginning). Nothing is calculated (lib/planCalendar.ts).

/** The list alone: the same on Ma fiche (inside a fold) and on paper (open, as a page of its own or a column of the leaflet). */
export function PlanCalendarList({ household, names, todayYear, horizonAge }: { household: Household; names: readonly string[]; todayYear: number; horizonAge: number }) {
  const { lang } = useLang()
  const c = PLAN_CALENDAR_COPY[lang]
  const years = calendarByYear(planCalendar(household, todayYear, horizonAge))
  const births = household.persons.map((p) => p.birth.year)
  if (years.length === 0) return <p className="field-row__hint">{c.empty}</p>
  return (
    <ol className="plan-calendar">
      {years.map((y) => (
        <li key={y.year} className="plan-calendar__year">
          <span className="plan-calendar__when">{formatYearAge(y.year, births, lang)}</span>
          <ul className="plan-calendar__events">
            {y.events.map((e, i) => (
              <li key={`${e.kind}-${e.who}-${i}`}>{calendarLine(c, e, names)}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}

/** On screen: closed by default, one tap away under the plan's line. */
export function PlanCalendar(props: { household: Household; names: readonly string[]; todayYear: number; horizonAge: number }) {
  const { lang } = useLang()
  const c = PLAN_CALENDAR_COPY[lang]
  return (
    <Fold summary={c.title} className="plan-calendar-fold">
      <p className="field-row__hint">{c.hint}</p>
      <PlanCalendarList {...props} />
    </Fold>
  )
}

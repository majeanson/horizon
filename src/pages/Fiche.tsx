import { useDeferredValue, useMemo } from 'react'
import { answerRequest } from '../lib/answerRequest'
import { Cluster } from '../components/Layout'
import { PageHead } from '../components/PageHead'
import { PrintChip } from '../components/PrintChip'
import { PlanCalendar } from '../components/results/PlanCalendar'
import { TimelineStrip } from '../components/results/TimelineStrip'
import { CashBufferCard } from '../components/sheet/CashBufferCard'
import { KidsCostCard } from '../components/sheet/KidsCostCard'
import { SheetSerious } from '../components/sheet/SheetSerious'
import { useLang, useT } from '../i18n'
import { profileGaps } from '../lib/profileGaps'
import { SHEET_COPY } from '../lib/sheetCopy'
import { sheetModel, unconfirmedFacts } from '../lib/sheetModel'
import { useProfile } from '../lib/store'
import { today } from '../lib/today'
import { useAnswer } from '../lib/useAnswer'
import { useFactImpact } from '../lib/useFactImpact'
import { useSettled } from '../lib/useSettled'

// « Ma fiche » — the household at a glance: the verdict, the plan's line, today and once retired, what it holds, what would sharpen the answer. One MODEL
// (lib/sheetModel.ts) of the profile, the verdict's earliest age and the results page's own ranking of the unconfirmed figures, drawn by SheetSerious;
// every card leads to the field or the page where its figure changes, so the sheet gathers the app rather than repeating it. Local like everything else:
// nothing here leaves the device, and the page asks the same workers for its searches as the results page does.

export function Fiche() {
  const t = useT()
  const { lang } = useLang()
  const profile = useProfile()
  // The projections behind the sheet run on the SETTLED profile, as the results page's do: a figure typed on another tab must not re-run them at every key.
  const settled = useDeferredValue(useSettled(profile))
  const { year, month } = today()
  const request = useMemo(() => answerRequest(settled, { year, month }), [settled, year, month])
  const { assumptions } = request
  const gaps = profileGaps(settled)
  const answer = useAnswer(request, gaps.length === 0)
  // undefined while the search is out; null when no age up to 70 works.
  const earliest = gaps.length > 0 ? undefined : answer.value === null ? undefined : answer.value.earliest
  // The figures not yet read off a document, and how far the answer moves if each were off: idle work, once the answer itself is in.
  const unconfirmed = useMemo(() => unconfirmedFacts(settled).map((f) => ({ id: f.id, owner: f.owner, kind: f.kind })), [settled])
  const impact = useFactImpact(settled.household, assumptions, unconfirmed, gaps.length === 0 && !request.everyoneRetired && answer.value !== null)
  const model = useMemo(() => sheetModel(settled, assumptions, earliest, impact?.swings), [settled, assumptions, earliest, impact])
  const births = settled.household.persons.map((p) => p.birth.year)
  const names = settled.household.persons.map((p, i) => p.name.trim() || (i === 0 ? t.profile.self : t.profile.spouse))
  const words = SHEET_COPY[lang]

  return (
    <section className="page-body">
      <PageHead title={words.title} subtitle={words.intro} />
      <SheetSerious
        model={model}
        lang={lang}
        births={births}
        names={names}
        cards={
          <>
            <CashBufferCard profile={settled} />
            <KidsCostCard profile={settled} />
          </>
        }
        timeline={
          gaps.length === 0 ? (
            <>
              <TimelineStrip household={settled.household} names={names} todayYear={year} horizonAge={assumptions.horizonAge} />
              <PlanCalendar household={settled.household} names={names} todayYear={year} horizonAge={assumptions.horizonAge} />
            </>
          ) : undefined
        }
      />
      <Cluster className="no-print">
        <PrintChip />
      </Cluster>
    </section>
  )
}

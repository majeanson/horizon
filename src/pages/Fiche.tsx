import { lazy, Suspense, useDeferredValue, useMemo } from 'react'
import { MAX_AGE, MIN_AGE, assumptionsOf } from '../lib/resultsModel'
import { retirementState } from '../engine/ledger'
import { Loading } from '../components/Loading'
import { PageHead } from '../components/PageHead'
import { ModeSwitch } from '../components/sheet/ModeSwitch'
import { SheetSerious } from '../components/sheet/SheetSerious'
import { useLang, useT } from '../i18n'
import { useMode } from '../lib/displayMode'
import { profileGaps } from '../lib/profileGaps'
import { MODE_COPY, SHEET_COPY } from '../lib/sheetCopy'
import { sheetModel } from '../lib/sheetModel'
import { useProfile } from '../lib/store'
import { today } from '../lib/today'
import { useAnswer } from '../lib/useAnswer'
import { useSettled } from '../lib/useSettled'

// « Ma fiche » — the household as a character sheet: five measures, what it holds, what is left to do, what is already done. One MODEL (lib/sheetModel.ts) of
// the profile and the verdict's earliest age, drawn by one of two SKINS chosen by the display mode: serious, or « Aventure » (a role-playing sheet, loaded only
// when asked for — its words and its layout ride their own chunk). Same data, same figures, different drawing. Local like everything else: nothing here leaves
// the device, and the page asks the same worker for its one search as the results page does.
const SheetRpg = lazy(() => import('../components/sheet/SheetRpg').then((m) => ({ default: m.SheetRpg })))

export function Fiche() {
  const t = useT()
  const { lang } = useLang()
  const mode = useMode()
  const profile = useProfile()
  // The projections behind the sheet run on the SETTLED profile, as the results page's do: a figure typed on another tab must not re-run them at every key.
  const settled = useDeferredValue(useSettled(profile))
  const { year, month } = today()
  const assumptions = useMemo(() => assumptionsOf(settled, { year, month }), [settled, year, month])
  const gaps = profileGaps(settled)
  const state = useMemo(() => retirementState(settled.household, assumptions), [settled, assumptions])
  const ages = settled.household.persons.map((p) => year - p.birth.year)
  const firstAge = Math.min(MAX_AGE, Math.max(MIN_AGE, Math.max(...ages)))
  const answer = useAnswer(settled.household, assumptions, firstAge, Math.min(...ages), state.everyoneRetired, gaps.length === 0)
  // undefined while the search is out; null when no age up to 70 works.
  const earliest = gaps.length > 0 ? undefined : answer.value === null ? undefined : answer.value.earliest
  const model = useMemo(() => sheetModel(settled, assumptions, earliest), [settled, assumptions, earliest])
  const births = settled.household.persons.map((p) => p.birth.year)
  const names = settled.household.persons.map((p, i) => p.name.trim() || (i === 0 ? t.profile.self : t.profile.spouse))
  const words = SHEET_COPY[lang]

  return (
    <section className="page-body">
      <PageHead title={words.title} />
      <div className="field-row sheet__mode">
        <p className="field-row__label">{MODE_COPY[lang].label}</p>
        <ModeSwitch />
        <p className="field-row__hint">{MODE_COPY[lang].hint}</p>
      </div>
      {mode === 'adventure' ? (
        <Suspense fallback={<Loading />}>
          <SheetRpg model={model} lang={lang} births={births} names={names} />
        </Suspense>
      ) : (
        <SheetSerious model={model} lang={lang} births={births} names={names} />
      )}
    </section>
  )
}

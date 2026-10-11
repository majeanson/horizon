import { useState } from 'react'
import { useLang } from '../../i18n'
import { estimateMissing } from '../../lib/estimates'
import { needsLevel } from '../../lib/levels'
import { LEVELS_COPY } from '../../lib/levelsCopy'
import { useProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { SubTabs } from '../SubTabs'
import { EstimateView, type EstimateDone } from './EstimateView'
import { LevelsView, type LevelsDone } from './LevelsView'
import { Section } from './shared'

// « Remplir ce qui manque » — the two ways to fill what is still blank without a document, in ONE section with a switch (they were two places of the page):
//   · « Je ne connais pas mes chiffres » — a standard of living (modeste · moyen · aisé) fills EVERY blank figure at once from what Statistics Canada says households of
//     the same age hold and spend (components/profile/LevelsView.tsx);
//   · « Estimer ce qui manque » — only the income history (from the salary) and a CELI room left at 0 (components/profile/EstimateView.tsx).
// Everything stays « estimated », a typed figure is never replaced, and one tap takes each back. A view is offered only while it has something to fill — or until its note
// (« 12 chiffres remplis », with the way back) has been read — and the whole section is silent when there is nothing left for either to do.
export default function FillBlanks() {
  const { lang } = useLang()
  const c = LEVELS_COPY[lang]
  const profile = useProfile()
  const now = today()
  const [levelDone, setLevelDone] = useState<LevelsDone | null>(null)
  const [estimateDone, setEstimateDone] = useState<EstimateDone | null>(null)
  const [picked, setPicked] = useState<'level' | 'estimate' | null>(null)
  const estimate = estimateMissing(profile, now)
  const views: ('level' | 'estimate')[] = [...(needsLevel(profile, now.year) || levelDone !== null ? (['level'] as const) : []), ...(estimate.years > 0 || estimate.rooms > 0 || estimate.rrspRooms > 0 || estimateDone !== null ? (['estimate'] as const) : [])]
  if (views.length === 0) return null
  const view = picked !== null && views.includes(picked) ? picked : views[0]
  return (
    <Section id="niveau" title={c.fill.title} subtitle={c.fill.lead} icon="piggy-bank-bold">
      {views.length > 1 && (
        <SubTabs
          size="mini"
          ariaLabel={c.fill.label}
          value={view}
          onSelect={setPicked}
          options={[
            { key: 'level' as const, label: c.fill.level },
            { key: 'estimate' as const, label: c.fill.estimate },
          ]}
        />
      )}
      {view === 'level' ? <LevelsView done={levelDone} setDone={setLevelDone} /> : <EstimateView done={estimateDone} setDone={setEstimateDone} />}
    </Section>
  )
}

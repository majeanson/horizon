import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../../Chip'
import { Cluster } from '../../Layout'
import { SectionHeader } from '../../SectionHeader'
import { Fold } from '../../Fold'
import { Skeleton } from '../../Skeleton'
import { STRESS_PRESETS } from '../../../lib/marketRange'
import { MAX_AGE } from '../../../lib/resultsModel'
import type { ResultsModel } from '../../../lib/useResultsPage'

// « Solidité de la réponse » — how firm the answer is: the same plan under the three scenarios and under a hard market (« En bref », always on the page), and how the age moves when returns,
// inflation and the plan's end age move (« Si l'avenir est moins bon », the 3 × 3 grids, one tap under it). One question at two depths: the second is a fold, kept in the address (`?solidite=grids`); a link to the grids
// (« Voir la sensibilité ») opens it.

// The grids ride their own chunk: only a reader who opens the second depth pays for them.
const SensitivityPanel = lazy(() => import('../SensitivityPanel').then((m) => ({ default: m.SensitivityPanel })))

/** The two blocks of « En bref »: the three scenarios and a hard market side by side. Rows from the first paint. */
function Brief({ m }: { m: ResultsModel }) {
  const { t, rc, activePreset, range, stress, mc, goTo, pathName, prudentGap } = m
  return (
    <div className="firm__pair">
      <div className="verdict__range">
        <p className="verdict__range-title">{rc.headline.rangeTitle}</p>
        <dl className="verdict__range-list">
          {(['prudent', 'neutral', 'bold'] as const).map((k) => (
            <div key={k} className={'verdict__range-item' + (activePreset === k ? ' is-on' : '')}>
              <dt>{t.assumptions.presets[k]}</dt>
              <dd className="mono">{range === undefined ? '…' : range[k] === null ? rc.headline.rangeNone(MAX_AGE) : rc.headline.rangeAge(range[k]!)}</dd>
            </div>
          ))}
        </dl>
        {range !== undefined && prudentGap && (
          <Cluster className="verdict__gap">
            <p className="verdict__note">{rc.headline.rangeGap}</p>
            <Chip onClick={() => goTo('proof', 'sensibilite')}>{rc.headline.trySensitivity}</Chip>
          </Cluster>
        )}
      </div>
      {/* The same plan under a hard stretch of markets: the order of the years, said where the answer is read. */}
      <div className="verdict__range">
        <p className="verdict__range-title">{mc.stress.title}</p>
        <dl className="verdict__range-list">
          {(['smooth', ...STRESS_PRESETS] as const).map((k) => (
            <div key={k} className={'verdict__range-item' + (pathName === k ? ' is-on' : '')}>
              <dt>{mc.path.names[k]}</dt>
              <dd className="mono">{stress === undefined ? '…' : stress[k] === null ? mc.stress.none(MAX_AGE) : mc.stress.age(stress[k]!)}</dd>
            </div>
          ))}
        </dl>
        <p className="verdict__note">
          {pathName !== 'smooth' && <>{mc.stress.active(mc.path.names[pathName])} </>}
          {mc.stress.hint}{' '}
          <Link className="info-note__link" to="/hypotheses">
            {mc.stress.link}
          </Link>
        </p>
      </div>
    </div>
  )
}

/** The section of the « proof » view: « En bref » on the page, the grids one tap under it. A household that has stopped working has no age to range over: it keeps only the grids, open and with no fold. */
export function FirmSection({ m }: { m: ResultsModel }) {
  const { r, rc, profile, assumptions, retiredNow, gridsOpen, setGridsOpen } = m
  const grids = (
    <>
      <p className="field-row__hint">{rc.headline.sensitivityDetail}</p>
      <Suspense fallback={<Skeleton count={4} />}>
        <SensitivityPanel household={profile.household} assumptions={assumptions} />
      </Suspense>
    </>
  )
  return (
    <div id="solidite" className="surface results-section firm" aria-label={rc.headline.firmTitle}>
      <SectionHeader title={rc.headline.firmTitle} />
      {retiredNow ? (
        <>
          <p className="verdict__range-title">{r.sensitivity.title}</p>
          {grids}
        </>
      ) : (
        <>
          <Brief m={m} />
          <Fold id="sensibilite" open={gridsOpen} onToggle={setGridsOpen} mountOnOpen summary={rc.firm.grids}>
            <p className="verdict__range-title">{r.sensitivity.title}</p>
            {grids}
          </Fold>
        </>
      )}
    </div>
  )
}

/** « En bref » alone, for the printed page: the grids are a screen's detail (they never were part of the print). */
export function FirmPrint({ m }: { m: ResultsModel }) {
  const { rc, retiredNow } = m
  if (retiredNow) return null
  return (
    <div id="solidite" className="surface results-section firm" aria-label={rc.headline.firmTitle}>
      <SectionHeader title={rc.headline.firmTitle} />
      <Brief m={m} />
    </div>
  )
}

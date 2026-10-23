import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../../Chip'
import { Cluster } from '../../Layout'
import { SectionHeader } from '../../SectionHeader'
import { Fold } from '../../Fold'
import { Skeleton } from '../../Skeleton'
import { SkeletonChips, SkeletonText } from '../../SkeletonShapes'
import { answerSpread } from '../../../lib/answerSpread'
import { ANSWER_SPREAD_COPY } from '../../../lib/answerSpreadCopy'
import { STRESS_PRESETS } from '../../../lib/marketRange'
import { MAX_AGE } from '../../../lib/resultsModel'
import type { ResultsModel } from '../../../lib/useResultsPage'

// « Solidité de la réponse » — how firm the answer is: the same plan under the three scenarios and under a hard market (« En bref », always on the page), and how the age moves when returns,
// inflation and the plan's end age move (« Si l'avenir est moins bon », the 3 × 3 grids, one tap under it). One question at two depths: the second is a fold, kept in the address (`?solidite=grids`); a link to the grids
// (« Voir la sensibilité ») opens it.

// The grids ride their own chunk: only a reader who opens the second depth pays for them.
const SensitivityPanel = lazy(() => import('../SensitivityPanel').then((m) => ({ default: m.SensitivityPanel })))

/** « Selon les trois scénarios et les parcours de marché : de 57 à 64 ans » — one sentence over the two blocks that hold it: only once both searches are in, and only when it says something the big age does not.
 *  (It sat on the answer's card beside the range "depending on your estimated figures": two ranges under one age, and nothing to say which to believe.) */
function AnswerSpreadLine({ m }: { m: ResultsModel }) {
  const age = m.headline.age
  if (m.retiredNow || m.headline.kind !== 'at' || age === null) return null
  const spread = answerSpread(age, m.range, m.stress)
  if (spread === null) return null
  const c = ANSWER_SPREAD_COPY[m.lang]
  return <p className="verdict__note">{spread.high === null ? c.open(spread.low, MAX_AGE) : c.range(spread.low, spread.high)}</p>
}

/** The two blocks of « En bref »: the three scenarios and a hard market side by side. Rows from the first paint. */
function Brief({ m }: { m: ResultsModel }) {
  const { t, rc, activePreset, range, stress, mc, goTo, pathName, prudentGap } = m
  return (
    <>
    <AnswerSpreadLine m={m} />
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
        {/* While the scenarios are worked out, the gap note waits in its place (a prudent answer later than the plan's is the usual case): it used to arrive and push the
            hard-market box and the grids down by its height. */}
        {range === undefined && (
          <Cluster className="skeleton-as-verdict__gap">
            <p className="verdict__note">
              <SkeletonText>{rc.headline.rangeGap}</SkeletonText>
            </p>
            <SkeletonChips labels={[rc.headline.trySensitivity]} />
          </Cluster>
        )}
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
    </>
  )
}

/**
 * The section of the « proof » view: « En bref » on the page, the grids one tap under it. A household that has stopped working has no age to range over: it keeps only the grids, open and with no fold.
 * `bare`: the body alone — the Preuve view draws the block around it (components/Accordion.tsx, where the title and the id live).
 */
export function FirmSection({ m, bare }: { m: ResultsModel; bare?: boolean }) {
  const { r, rc, profile, assumptions, retiredNow, gridsOpen, setGridsOpen } = m
  const grids = (
    <>
      <p className="field-row__hint">{rc.headline.sensitivityDetail}</p>
      <Suspense fallback={<Skeleton count={4} />}>
        <SensitivityPanel household={profile.household} assumptions={assumptions} />
      </Suspense>
    </>
  )
  const body = retiredNow ? (
    <>
      <p className="verdict__range-title">{r.sensitivity.title}</p>
      {grids}
    </>
  ) : (
    <>
      <Brief m={m} />
      <Fold id="sensibilite" concept="scenario" open={gridsOpen} onToggle={setGridsOpen} mountOnOpen summary={rc.firm.grids}>
        <p className="verdict__range-title">{r.sensitivity.title}</p>
        {grids}
      </Fold>
    </>
  )
  if (bare) return body
  return (
    <div id="solidite" className="surface results-section firm" aria-label={rc.headline.firmTitle}>
      <SectionHeader title={rc.headline.firmTitle} concept="solidite" />
      {body}
    </div>
  )
}

/** « En bref » alone, for the printed page: the grids are a screen's detail (they never were part of the print). */
export function FirmPrint({ m }: { m: ResultsModel }) {
  const { rc, retiredNow } = m
  if (retiredNow) return null
  return (
    <div id="solidite" className="surface results-section firm" aria-label={rc.headline.firmTitle}>
      <SectionHeader title={rc.headline.firmTitle} concept="solidite" />
      <Brief m={m} />
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Chip } from '../../Chip'
import { Cluster } from '../../Layout'
import { SectionHeader } from '../../SectionHeader'
import { STRESS_PRESETS } from '../../../lib/marketRange'
import { MAX_AGE } from '../../../lib/resultsModel'
import type { ResultsModel } from '../../../lib/useResultsPage'

// « Solidité de la réponse » — how firm the answer is: the same plan under the three scenarios and under a hard market. It is a CHECK on the answer, so it lives
// in the « verify » view (it used to ride on the answer view, which it lengthened).
export function FirmSection({ m }: { m: ResultsModel }) {
  const { t, rc, retiredNow, activePreset, range, stress, mc, goTo, pathName, prudentGap } = m
  return (
    <>
              {/* How firm the answer is: the same plan under the three scenarios and a hard market side by side, then what would move it. Rows from the first paint. */}
              {!retiredNow && (
                <div id="solidite" className="surface results-section firm" aria-label={rc.headline.firmTitle}>
                  <SectionHeader title={rc.headline.firmTitle} />
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
                        <Chip onClick={() => goTo('verify', 'sensibilite')}>{rc.headline.trySensitivity}</Chip>
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
                </div>
              )}

    </>
  )
}

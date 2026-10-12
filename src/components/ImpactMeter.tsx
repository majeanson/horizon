import type { ImpactLevel, ImpactTilt } from '../engine/assumptionImpact'
import { LEVEL_POSITION } from '../engine/assumptionImpact'
import { Fold } from './Fold'

// « Where does this number sit, and what does it do to the plan? » — a five-step track with a marker, the level and
// what it leans toward in words, and one sentence on why it matters. The track is a picture of the words, never the
// only carrier of them: the level and the lean are text, so colour is decoration.
//
// All copy comes from the caller (it is i18n); the component only lays it out.
export function ImpactMeter({
  level,
  tilt,
  levelLabel,
  tiltLabel,
  why,
  whyTitle,
  outside,
  ends,
}: {
  level: ImpactLevel
  tilt: ImpactTilt
  levelLabel: string
  tiltLabel: string
  /** Absent when a neighbouring meter already says it (the three account rates share one reason). */
  why?: string
  whyTitle: string
  /** Shown when the value is past the range the three scenarios span. */
  outside?: string
  /** The two ends of the track, said (« Très bas », « Très élevé »): a marker on a bare track reads as good or bad, these say it is only a place on a scale. */
  ends?: readonly [string, string]
}) {
  const at = LEVEL_POSITION[level]
  return (
    <div className={`impact impact--${tilt}`}>
      <div className="impact__head">
        {ends && (
          <span className="impact__end" aria-hidden="true">
            {ends[0]}
          </span>
        )}
        <span className="impact__track" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={'impact__step' + (i === at ? ' impact__step--on' : '')} />
          ))}
        </span>
        {ends && (
          <span className="impact__end" aria-hidden="true">
            {ends[1]}
          </span>
        )}
        <span className="impact__level">{levelLabel}</span>
        <span className="impact__tilt">{tiltLabel}</span>
      </div>
      {outside && (level === 'below' || level === 'above') && <p className="impact__outside">{outside}</p>}
      {why !== undefined && (
        <Fold className="impact__why" summary={<strong>{whyTitle}</strong>}>
          <p>{why}</p>
        </Fold>
      )}
    </div>
  )
}

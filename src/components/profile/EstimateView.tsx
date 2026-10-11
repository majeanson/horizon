import { useLang } from '../../i18n'
import { estimateMissing } from '../../lib/estimates'
import { GUIDE_COPY } from '../../lib/guideCopy'
import type { Profile } from '../../lib/schema'
import { replaceProfile, updateProfile, useProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'
import { StatusMessage } from '../StatusMessage'

/** What the estimate just did, said once — with the profile as it was, so one tap takes it back. */
export type EstimateDone = { note: string; before: Profile | null }

// « Estimer ce qui manque » — the second view of « Remplir ce qui manque » (FillBlanks.tsx): fill the blank earnings years (from the salary) and a CELI room left at 0 (from the age
// and the balance), confirm nothing, never touch a figure that was typed. It used to be a chip at the foot of « Rendre mon profil exact »; it is the same job as the level picker.
export function EstimateView({ done, setDone }: { done: EstimateDone | null; setDone: (d: EstimateDone | null) => void }) {
  const { lang } = useLang()
  const c = GUIDE_COPY[lang]
  const profile = useProfile()
  const estimate = () => {
    const e = estimateMissing(profile, today())
    if (e.years === 0 && e.rooms === 0) return setDone({ note: c.panel.estimateNothing, before: null })
    updateProfile((p) => estimateMissing(p, today()).profile)
    setDone({ note: c.panel.estimateDone(e.years, e.rooms), before: profile })
  }
  const undo = () => {
    if (done?.before) replaceProfile(done.before)
    setDone(null)
  }
  return (
    <>
      <h3 className="fill__title">{c.panel.estimate}</h3>
      <p className="field-row__hint">{c.panel.quickDoes}</p>
      <Cluster>
        <Chip onClick={estimate}>{c.panel.estimate}</Chip>
      </Cluster>
      {done && (
        <Cluster>
          <StatusMessage tone="info">{done.note}</StatusMessage>
          {done.before !== null && <Chip onClick={undo}>{c.panel.estimateUndo}</Chip>}
        </Cluster>
      )}
    </>
  )
}

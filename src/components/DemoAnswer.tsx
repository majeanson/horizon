import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ExampleId } from '../engine/golden/examples'
import { useLang, useT } from '../i18n'
import { answerRequest } from '../lib/answerRequest'
import { loadExample, exampleProfile } from '../lib/example'
import { EXAMPLE_COPY } from '../lib/exampleCopy'
import { useConfirm } from '../lib/confirm'
import { profileGaps } from '../lib/profileGaps'
import { AGE_TOKEN, RESULTS_COPY } from '../lib/resultsCopy'
import { MAX_AGE } from '../lib/resultsModel'
import { useProfile } from '../lib/store'
import { useNotice } from '../lib/toast'
import { today } from '../lib/today'
import { useAnswer } from '../lib/useAnswer'
import { WELCOME_COPY } from '../lib/welcomeCopy'
import { Chip } from './Chip'
import { Cluster } from './Layout'
import { Skeleton } from './Skeleton'

// THE FIRST VISIT'S PROOF: before a blank household types anything, Accueil shows the product WORKING — the real answer (the same worker, the same
// sentence as the results page) for an example household, in a frame that says it is not theirs. Six households to swap between — the average couple
// first, then three that stop EARLY (the house sold at 58, the high earners at 57, the planned life at 57: the answer a visitor hopes to see is shown
// reachable, not only the one at 64), then the modest and the growing family; « Essayer avec ce ménage » makes the shown one the household on this
// device and opens the results. Nothing here writes until that tap, and a profile that already holds something typed is replaced only after the same
// confirmation Données asks.
const DEMO_IDS = ['average', 'downsizer', 'rich', 'planner', 'modest', 'family'] as const satisfies readonly ExampleId[]

export function DemoAnswer() {
  const t = useT()
  const { lang } = useLang()
  const c = WELCOME_COPY[lang]
  const rc = RESULTS_COPY[lang]
  const navigate = useNavigate()
  const confirm = useConfirm()
  const notice = useNotice()
  const profile = useProfile()
  const [id, setId] = useState<ExampleId>('average')
  const { year, month } = today()
  // One example profile and one request per household shown: the worker is asked again only when the household changes.
  const example = useMemo(() => exampleProfile(id), [id])
  const request = useMemo(() => answerRequest(example, { year, month }), [example, year, month])
  const answer = useAnswer(request, true, 'idle')
  const got = answer.value
  const together = example.household.persons.length > 1
  const sentence = got === null ? null : got.headline.kind === 'none' ? rc.headline.none(MAX_AGE) : got.headline.kind === 'now' ? rc.headline.now : rc.headline.at(AGE_TOKEN, together)
  const [before, after] = sentence === null ? ['', undefined] : sentence.split(AGE_TOKEN)
  const names = EXAMPLE_COPY[lang]

  // Anything typed — a confirmed figure, or one of the two things an answer needs already filled — is worth a question before it is replaced.
  const hasTyped = profile.confirmed.length > 0 || profileGaps(profile).length < 2
  const tryIt = async () => {
    if (hasTyped && !(await confirm({ message: t.data.example.confirm(names[id].name), confirmLabel: t.data.example.confirmLabel, tone: 'default' }))) return
    // Données' « rétablir » lives in that page's memory and is gone on navigation; here the displaced profile is one that held nothing, or was just confirmed away.
    loadExample(id)
    notice(t.data.example.done)
    navigate('/resultats')
  }

  return (
    <section className="demo surface" aria-labelledby="demo-title">
      <h2 id="demo-title" className="welcome__title">
        {c.demo.title}
      </h2>
      <Cluster role="group" aria-label={c.demo.pick}>
        {DEMO_IDS.map((x) => (
          <Chip key={x} radio selected={id === x} onClick={() => setId(x)}>
            {names[x].name}
          </Chip>
        ))}
      </Cluster>
      <p className="field-row__hint">{names[id].story}</p>
      <div className={'demo__answer' + (answer.busy ? ' is-busy' : '')} role="status" aria-live="polite" aria-busy={answer.busy || undefined}>
        {sentence === null ? (
          <Skeleton count={1} className="skeleton--verdict" />
        ) : (
          <p className="verdict__line">
            {after === undefined ? (
              before
            ) : (
              <>
                <span className="verdict__lead">{before}</span>
                <span className="verdict__big">
                  <strong key={got!.headline.age} className="verdict__age">
                    {rc.headline.ageText(got!.headline.age!)}
                  </strong>
                  {after}
                </span>
              </>
            )}
          </p>
        )}
      </div>
      <p className="verdict__note">{c.demo.frame}</p>
      <Cluster>
        <Chip onClick={() => void tryIt()}>{c.demo.try}</Chip>
      </Cluster>
    </section>
  )
}

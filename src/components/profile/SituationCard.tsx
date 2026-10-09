import { useLang, useT } from '../../i18n'
import type { PersonId } from '../../engine/types'
import { useConfirm } from '../../lib/confirm'
import { addHome } from '../../lib/profileEdit'
import { answer, applies, clearTopic, HOUSEHOLD_TOPICS, lostBy, PERSON_TOPICS, useYes, type Topic } from '../../lib/situation'
import { SITUATION_COPY } from '../../lib/situationCopy'
import { updateProfile, useProfile } from '../../lib/store'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'
import { Section } from './shared'

// « Ma situation » — the plain yes / no questions that decide what the rest of the form shows (lib/situation.ts). « Oui » opens the matching
// section (or starts the home); « Non » closes it, and over typed figures says first what would be lost. Nothing here is a profile figure: a
// « yes » with nothing typed yet is a note to oneself on this device.
export default function SituationCard() {
  const t = useT()
  const { lang } = useLang()
  const c = SITUATION_COPY[lang]
  const profile = useProfile()
  const yes = useYes()
  const confirm = useConfirm()
  const people = profile.household.persons

  const loss = (topic: Topic, owner?: PersonId): string => {
    const n = lostBy(profile, topic, owner)
    switch (topic) {
      case 'events':
        return c.lose.events(n)
      case 'pension':
        return c.lose.pension(n)
      default:
        return c.lose[topic]
    }
  }

  const ask = async (topic: Topic, wants: boolean, owner?: PersonId) => {
    if (wants) {
      // The home needs no note: adding it IS the answer (the section shows because it exists, and goes when it is removed).
      if (topic === 'home') updateProfile(addHome)
      else answer(topic, true, owner)
      return
    }
    if (lostBy(profile, topic, owner) > 0 && !(await confirm({ message: loss(topic, owner), confirmLabel: c.confirmNo }))) return
    updateProfile((p) => clearTopic(p, topic, owner))
    answer(topic, false, owner)
  }

  const row = (topic: Topic, owner?: PersonId) => {
    const on = applies(profile, yes, topic, owner)
    const id = `situation-${topic}${owner ? `-${owner}` : ''}`
    return (
      <div key={id} className="situation__q">
        <p id={id} className="situation__question">
          {c.q[topic]}
        </p>
        <Cluster role="radiogroup" aria-labelledby={id}>
          <Chip radio selected={on} onClick={() => void ask(topic, true, owner)}>
            {c.yes}
          </Chip>
          <Chip radio selected={!on} onClick={() => void ask(topic, false, owner)}>
            {c.no}
          </Chip>
        </Cluster>
        <p className="field-row__hint">{c.hint[topic]}</p>
      </div>
    )
  }

  return (
    <Section id="situation" title={c.title} subtitle={c.lead} icon="users-three-bold">
      {HOUSEHOLD_TOPICS.map((topic) => row(topic))}
      {people.map((p, i) => {
        const name = p.name.trim() || (i === 0 ? t.profile.self : t.profile.spouse)
        return (
          <div key={p.id} role="group" aria-label={name} className="situation__person">
            {people.length > 1 && <h3 className="situation__who">{name}</h3>}
            {PERSON_TOPICS.map((topic) => row(topic, p.id))}
          </div>
        )
      })}
      <p className="field-row__hint">{c.hidden}</p>
    </Section>
  )
}

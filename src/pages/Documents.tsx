import { Link } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { Cluster } from '../components/Layout'
import { NextStep } from '../components/NextStep'
import { PageHead } from '../components/PageHead'
import { useLang, useT } from '../i18n'
import { DOCUMENTS_COPY } from '../lib/documentsCopy'
import { documentItems, documentsText } from '../lib/documentsList'
import { clearTicks, toggleTick, useTicks } from '../lib/documentsTicks'
import { saveAsFile } from '../lib/download'
import { GUIDE_COPY } from '../lib/guideCopy'
import { docApplies, useYes } from '../lib/situation'
import { useProfile } from '../lib/store'
import { useNotice } from '../lib/toast'
import type { DocId } from '../lib/facts'

// « Documents à rassembler » — what a full profile is typed from, as a list to work through BEFORE typing: tick what is in hand, print it or download it
// as a text file, go and find the rest, come back later (offline too: the page is part of the installed app, and a tick is kept on this device).
// Each document says who it is for, what is read off it (the figures Profil will ask for), where it comes from, and the official page when there is one.
export function Documents() {
  const t = useT()
  const { lang } = useLang()
  const c = DOCUMENTS_COPY[lang]
  const guide = GUIDE_COPY[lang]
  const profile = useProfile()
  const notice = useNotice()
  const ticked = useTicks()
  const people = profile.household.persons.map((p, i) => ({ id: p.id, name: p.name.trim() || (i === 0 ? t.profile.self : t.profile.spouse) }))
  const urlOf = (doc: DocId): string | null => {
    const link = guide.docs[doc].link
    return link === null ? null : (t.info[link].url ?? null) || null
  }
  const yes = useYes()
  // Only the documents this household has use for: the home's papers, the employer's statement and the proof of residence need a « yes » in « Ma situation » (or the figures already there).
  const items = documentItems(people, guide, urlOf, (doc, owner) => docApplies(profile, yes, doc, owner))
  const done = items.filter((it) => ticked.has(it.id)).length
  const download = () => {
    saveAsFile(documentsText(items, ticked, { title: c.fileTitle, intro: c.fileIntro, readOff: c.readOff, where: c.where, official: c.official, importance: c.importance, weights: c.weights, household: c.household, you: c.you }), c.file, 'text/plain;charset=utf-8')
    notice(c.downloaded)
  }
  const household = items.filter((it) => it.owner === 'household')
  const renderItem = (it: (typeof items)[number]) => {
          const on = ticked.has(it.id)
          const label = `${c.have} : ${it.name}${it.who ? ` — ${it.who}` : ''}`
          return (
            <li key={it.id} className={'docs-item surface' + (on ? ' is-done' : '')}>
              <label className="docs-item__check">
                <input type="checkbox" checked={on} onChange={() => toggleTick(it.id)} aria-label={label} />
                <span>{c.have}</span>
              </label>
              <div className="docs-item__body">
                <h3 className="docs-item__name">{it.name}</h3>
                <p className={`docs-item__weight docs-item__weight--${it.weight} mono`}>
                  {c.importance} : {c.weights[it.weight]}
                </p>
                {c.when[it.doc] && <p className="field-row__hint">{c.when[it.doc]}</p>}
                <p>{it.what}</p>
                <p className="docs-item__figures">
                  <strong>{c.readOff}</strong> {it.figures.join(' · ')}
                </p>
                <p>
                  <strong>{c.where}</strong> {it.how}
                </p>
                {it.url !== null ? (
                  <a className="info-note__link" href={it.url} target="_blank" rel="noopener noreferrer">
                    {c.openOfficial}
                  </a>
                ) : (
                  <p className="field-row__hint">{c.noPage}</p>
                )}
              </div>
            </li>
          )
        }
  return (
    <section className="page-body docs-page">
      <PageHead title={c.title} subtitle={c.subtitle} />
      <p className="docs-page__intro">{c.intro}</p>
      <p className="docs-page__intro">{c.rankNote}</p>
      <Cluster className="no-print">
        <Chip icon="printer-bold" onClick={() => window.print()}>
          {c.print}
        </Chip>
        <Chip icon="download-simple-bold" onClick={download}>
          {c.download}
        </Chip>
        <Chip onClick={clearTicks} disabled={done === 0}>
          {c.reset}
        </Chip>
      </Cluster>
      <p className="docs-page__progress" role="status">
        {done === items.length ? c.progressAll : c.progress(done, items.length)}
      </p>
      {household.length > 0 && (
        <section className="docs-group" aria-label={c.household}>
          <h2 className="docs-group__title">{c.household}</h2>
          <ul className="docs-list">{household.map(renderItem)}</ul>
        </section>
      )}
      <div className={'persons' + (people.length > 1 ? ' persons--two persons--aligned' : '')}>
        {people.map((p, i) => (
          <section key={p.id} className={`person who who--${Math.min(i, 1)}`} aria-label={p.name}>
            <h2 className="person__title">{people.length > 1 ? p.name : c.you}</h2>
            <ul className="docs-list">{items.filter((it) => it.owner === p.id).map(renderItem)}</ul>
          </section>
        ))}
      </div>
      <p className="field-row__hint no-print">
        {c.glossaryNote} <Link to="/glossaire#documents">{c.glossaryLink}</Link>.
      </p>
      <NextStep to="/saisie" label={c.entry}>
        <p>{c.next}</p>
        <p>{c.entryHint}</p>
        <p>
          <Link to="/profil">{c.nextGo}</Link>
        </p>
      </NextStep>
    </section>
  )
}

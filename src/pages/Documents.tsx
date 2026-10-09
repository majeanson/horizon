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
  const items = documentItems(people, guide, urlOf)
  const done = items.filter((it) => ticked.has(it.id)).length
  const download = () => {
    saveAsFile(documentsText(items, ticked, { title: c.fileTitle, intro: c.fileIntro, readOff: c.readOff, where: c.where, official: c.official, importance: c.importance, weights: c.weights }), c.file, 'text/plain;charset=utf-8')
    notice(c.downloaded)
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
      <ul className="docs-list">
        {items.map((it) => {
          const on = ticked.has(it.id)
          const who = it.owner === 'household' ? c.household : it.who !== null ? c.forWho(it.who) : null
          const label = `${c.have} : ${it.name}${it.who ? ` — ${it.who}` : ''}`
          return (
            <li key={it.id} className={'docs-item surface' + (on ? ' is-done' : '')}>
              <label className="docs-item__check">
                <input type="checkbox" checked={on} onChange={() => toggleTick(it.id)} aria-label={label} />
                <span>{c.have}</span>
              </label>
              <div className="docs-item__body">
                <h2 className="docs-item__name">{it.name}</h2>
                <p className={`docs-item__weight docs-item__weight--${it.weight} mono`}>
                  {c.importance} : {c.weights[it.weight]}
                </p>
                {who !== null && <p className="docs-item__who">{who}</p>}
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
        })}
      </ul>
      <p className="field-row__hint no-print">
        {c.glossaryNote} <Link to="/glossaire#documents">{c.glossaryLink}</Link>.
      </p>
      <NextStep to="/saisie" label={c.entry}>
        <p>{c.next}</p>
        <p>{c.entryHint}</p>
        <p>
          <Link to="/">{c.nextGo}</Link>
        </p>
      </NextStep>
    </section>
  )
}

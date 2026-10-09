import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLang } from '../i18n'
import { GLOSSARY_COPY } from '../lib/glossaryCopy'
import { DOCUMENTS_COPY } from '../lib/documentsCopy'
import { glossaryAnchor } from '../lib/glossIndex'
import { scrollToSection } from '../lib/motion'
import { Chip } from '../components/Chip'
import { Icon } from '../components/Icon'
import { PageHead } from '../components/PageHead'
import { SectionNav } from '../components/SectionNav'
import { Section } from '../components/profile/shared'
import { StatusMessage } from '../components/StatusMessage'

// « Glossaire » — behind the book in the top bar. Every abbreviation the pages use, spelled out once, in plain language,
// with the official page to read next; then the few words Horizon uses in its own sense (nid, scénario, départ …); then
// where each document of the profile comes from, and where to check the answer. The pages themselves keep the short forms,
// and a sigle in a hint or an ⓘ note links here (components/Gloss.tsx) — the entry it names is scrolled to and marked.
// A definition list, so a screen reader announces term and meaning as a pair, and the browser's find-in-page works on it.
// Words come from lib/glossaryCopy.ts (fetched with this page, not with the shell).

function OfficialLink({ url, host, label }: { url: string; host?: string; label: string }) {
  return (
    <a className="info-note__link" href={url} target="_blank" rel="noopener noreferrer">
      {label}
      {host ? ` — ${host}` : ''}
      <Icon name="arrow-up-right-bold" size={14} />
    </a>
  )
}

export function Glossaire() {
  const { lang } = useLang()
  const { hash } = useLocation()
  const g = GLOSSARY_COPY[lang]
  const target = hash.startsWith('#') ? hash.slice(1) : ''

  // Arriving from a hint (or following one while already here): go to the entry. After the first paint, so the lazy page and
  // its sections exist; the shell's own scroll-to-top has already run by then.
  useEffect(() => {
    if (!target) return
    return scrollToSection(target)
  }, [target])

  const groupId = (id: string) => `glossaire-${id}`
  const links = [
    ...g.groups.map((group) => ({ id: groupId(group.id), label: group.title })),
    { id: groupId(g.docs.id), label: g.docs.title },
    { id: groupId(g.help.id), label: g.help.title },
  ]

  return (
    <section className="page-body">
      <PageHead title={g.title} subtitle={g.subtitle} />
      <p className="glossary__intro">{g.intro}</p>
      <SectionNav ariaLabel={g.nav} links={links} />
      {g.groups.map((group) => (
        <Section key={group.id} id={groupId(group.id)} title={group.title} subtitle={group.hint}>
          <dl className="glossary">
            {group.terms.map((term) => {
              const anchor = glossaryAnchor(term.id)
              return (
                <div key={term.id} id={anchor} className={'glossary__term' + (anchor === target ? ' is-target' : '')}>
                  <dt>
                    <span className="glossary__abbr">{term.abbr}</span>
                    <span className="glossary__name">{term.name}</span>
                  </dt>
                  <dd>
                    <p>{term.plain}</p>
                    {term.url && <OfficialLink url={term.url} host={term.host} label={g.openLink} />}
                  </dd>
                </div>
              )
            })}
          </dl>
        </Section>
      ))}
      <Section id={groupId(g.docs.id)} title={g.docs.title} subtitle={g.docs.hint}>
        <ul className="glossary-docs">
          {g.docs.items.map((item) => (
            <li key={item.doc} className="glossary-docs__item">
              <strong>{item.doc}</strong>
              <span>{item.gives}</span>
              <span className="glossary-docs__how">{item.how}</span>
              {item.url && <OfficialLink url={item.url} host={item.host} label={g.openLink} />}
            </li>
          ))}
        </ul>
        <Chip to="/documents" icon="identification-card-bold">
          {DOCUMENTS_COPY[lang].link}
        </Chip>
      </Section>
      <Section id={groupId(g.help.id)} title={g.help.title} subtitle={g.help.hint}>
        <ul className="glossary-docs">
          {g.help.items.map((item) => (
            <li key={item.label} className="glossary-docs__item">
              <strong>{item.label}</strong>
              <span>{item.plain}</span>
              <OfficialLink url={item.url} host={item.host} label={g.openLink} />
            </li>
          ))}
        </ul>
        <StatusMessage tone="info">{g.help.advice}</StatusMessage>
      </Section>
    </section>
  )
}

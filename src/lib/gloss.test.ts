import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Gloss } from '../components/Gloss.tsx'
import { LangContext, type Lang } from '../i18n.ts'

// A sigle in running text becomes a link to its glossary entry — once per text, and only a sigle the glossary explains.

const render = (text: string, lang: Lang = 'fr') =>
  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(LangContext.Provider, { value: { lang, setLang: () => {} } }, createElement(Gloss, null, text))))

describe('Gloss', () => {
  it('links a sigle to its entry', () => {
    const html = render('Votre rente du RRQ commence à 65 ans.')
    expect(html).toContain('href="/glossaire#terme-rrq"')
    expect(html).toContain('>RRQ</a>')
  })

  it('links a sigle in parentheses and one next to punctuation', () => {
    const html = render('Régime de rentes du Québec (RRQ), puis le REER.')
    expect(html).toContain('#terme-rrq"')
    expect(html).toContain('#terme-reer"')
  })

  it('links the FIRST occurrence only', () => {
    expect(render('RRQ, encore le RRQ, toujours le RRQ.').match(/<a /g)).toHaveLength(1)
  })

  it('leaves alone what is not a sigle the glossary knows (a plural, a word in capitals, an unknown sigle)', () => {
    for (const text of ['Des REERs et des CELIs.', 'ERREUR de saisie', 'Le TPS et le SIGLE', 'Texte sans sigle']) expect(render(text), text).not.toContain('<a ')
  })

  it('links the sigles of the reader’s own language, not the other one', () => {
    expect(render('Your QPP and RRSP.', 'en')).toContain('#terme-rrq"')
    expect(render('Your RRQ and REER.', 'en')).not.toContain('<a ')
    expect(render('Votre QPP.', 'fr')).not.toContain('<a ')
  })
})

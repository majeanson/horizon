import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DOCUMENT_META, applyDocumentLang } from './documentLang.ts'

// A static index.html and a static manifest cannot follow the reader, so the page says BOTH languages for the readers
// that never run a script, and the app narrows it to one at run time. This pins all four pieces: the static page, the
// two manifests, the service worker's list of files, and the run-time switch.

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel: string) => readFileSync(join(rootDir, rel), 'utf8')
const html = read('index.html')
const manifest = (name: string) => JSON.parse(read(`public/${name}`)) as Record<string, unknown>

/** A document with index.html's <head>, as the app finds it before it runs. */
function pageFromIndexHtml(): Document {
  const doc = document.implementation.createHTMLDocument('Horizon')
  doc.documentElement.lang = 'fr'
  doc.head.innerHTML = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>')).replace(/<script[\s\S]*?<\/script>/g, '')
  return doc
}

const meta = (doc: Document, selector: string) => doc.head.querySelector<HTMLMetaElement>(selector)?.content
const href = (doc: Document) => doc.head.querySelector('link[rel="manifest"]')?.getAttribute('href')

describe('index.html says both languages to a reader that runs no script', () => {
  it('carries a French and an English sentence in the description and the link preview', () => {
    const doc = pageFromIndexHtml()
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]']) {
      const text = meta(doc, selector)!
      expect(text, selector).toMatch(/retraite/)
      expect(text, selector).toMatch(/retire/)
    }
    expect(meta(doc, 'meta[property="og:locale"]')).toBe('fr_CA')
    expect(meta(doc, 'meta[property="og:locale:alternate"]')).toBe('en_CA')
  })

  it('points at the French manifest by default', () => {
    expect(href(pageFromIndexHtml())).toBe(DOCUMENT_META.fr.manifest)
  })
})

describe('applyDocumentLang narrows the page to the reader’s language', () => {
  it('English: <html lang>, the description, the link preview, the locale and the manifest all follow', () => {
    const doc = pageFromIndexHtml()
    applyDocumentLang('en', doc)
    expect(doc.documentElement.lang).toBe('en')
    expect(meta(doc, 'meta[name="description"]')).toBe(DOCUMENT_META.en.description)
    expect(meta(doc, 'meta[property="og:description"]')).toBe(DOCUMENT_META.en.ogDescription)
    expect(meta(doc, 'meta[property="og:locale"]')).toBe('en_CA')
    expect(href(doc)).toBe('/manifest.en.webmanifest')
    expect(meta(doc, 'meta[name="description"]')).not.toMatch(/retraite/)
  })

  it('French again after English (a reader switching back), and idempotent', () => {
    const doc = pageFromIndexHtml()
    applyDocumentLang('en', doc)
    applyDocumentLang('fr', doc)
    applyDocumentLang('fr', doc)
    expect(doc.documentElement.lang).toBe('fr')
    expect(meta(doc, 'meta[name="description"]')).toBe(DOCUMENT_META.fr.description)
    expect(meta(doc, 'meta[property="og:locale"]')).toBe('fr_CA')
    expect(href(doc)).toBe('/manifest.webmanifest')
  })

  it('does nothing — and does not throw — for a tag the page does not have', () => {
    const doc = document.implementation.createHTMLDocument('x')
    expect(() => applyDocumentLang('en', doc)).not.toThrow()
    expect(doc.documentElement.lang).toBe('en')
    expect(doc.head.children.length).toBe(0)
  })

  it('writes each language in its own language', () => {
    expect(DOCUMENT_META.fr.description).not.toBe(DOCUMENT_META.en.description)
    expect(DOCUMENT_META.fr.ogDescription).not.toBe(DOCUMENT_META.en.ogDescription)
    expect(DOCUMENT_META.fr.description).toMatch(/retraite/)
    expect(DOCUMENT_META.en.description).toMatch(/retire/)
  })
})

describe('the two install manifests', () => {
  const fr = manifest('manifest.webmanifest')
  const en = manifest('manifest.en.webmanifest')

  it('are each a real file, one per language the app speaks', () => {
    for (const m of Object.values(DOCUMENT_META)) expect(existsSync(join(rootDir, 'public', m.manifest.slice(1))), m.manifest).toBe(true)
    expect(fr.lang).toBe('fr')
    expect(en.lang).toBe('en')
  })

  it('name and describe the app in their own language', () => {
    expect(en.name).not.toBe(fr.name)
    expect(en.description).not.toBe(fr.description)
    expect(String(fr.description)).toMatch(/retraite/)
    expect(String(en.description)).toMatch(/retire/)
    expect(en.short_name).toBe(fr.short_name)
  })

  it('are ONE app: same identity, scope, start page, icons and colours — only the words differ', () => {
    const words = new Set(['name', 'description', 'lang'])
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
    for (const key of Object.keys(fr)) if (!words.has(key)) expect(en[key], key).toEqual(fr[key])
    expect(fr.id).toBe('/')
  })
})

describe('the service worker keeps both manifests for an offline start', () => {
  it('lists every language’s manifest among the files it precaches', () => {
    const vite = read('vite.config.ts')
    const shell = vite.slice(vite.indexOf('const PUBLIC_SHELL'), vite.indexOf(']', vite.indexOf('const PUBLIC_SHELL')))
    for (const m of Object.values(DOCUMENT_META)) expect(shell, m.manifest).toContain(`'${m.manifest}'`)
  })
})

describe('canary: the two-language check can fail', () => {
  const bothLanguages = (text: string) => /retraite/.test(text) && /retire/.test(text)
  it('a description in one language only is caught, and the two languages carry different manifests', () => {
    expect(bothLanguages('Quand pouvez-vous prendre votre retraite ?')).toBe(false)
    expect(bothLanguages('When can you retire?')).toBe(false)
    expect(bothLanguages('Quand prendre sa retraite ? When can you retire?')).toBe(true)
    expect(DOCUMENT_META.fr.manifest).not.toBe(DOCUMENT_META.en.manifest)
  })
})

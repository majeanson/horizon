import { describe, expect, it } from 'vitest'
import { RESULTS_COPY } from './resultsCopy.ts'
import { csvLabel } from './yearCsv.ts'

// THE NAME OF THE FILE THE SPREADSHEET DOWNLOADS AS. A scenario's name goes into a file name; whatever it holds, the file must be one a file system accepts, readable, and never a file called
// `…-.csv`. The slug was written inside the component (untested); it is a function now, and the two names the copy builds around it are pinned.

const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001f]/
const SLUG = /^[\p{L}\p{N}]+(-[\p{L}\p{N}]+)*$/u

describe('csvLabel: a scenario’s name as part of a file name', () => {
  const samples: [string, string][] = [
    ['Retirer à 60 ans', 'Retirer-à-60-ans'],
    ['Retire at 60', 'Retire-at-60'],
    ['Mon plan (60 ans)', 'Mon-plan-60-ans'],
    ['Tous les deux, à 62 / 65', 'Tous-les-deux-à-62-65'],
    ['  entouré d’espaces  ', 'entouré-d-espaces'],
    ['é', 'é'],
  ]
  for (const [label, slug] of samples) it(`« ${label} » is ${slug}`, () => expect(csvLabel(label)).toBe(slug))

  it('everything a file system refuses is gone, however the name is made', () => {
    for (const label of ['A/B:C*D?"E<F>G|H\\I', '../../etc/passwd', 'C:\\Users\\x', 'tab\tand\nnewline', 'a'.repeat(300), '🙂 plan 🙂']) {
      const s = csvLabel(label)
      expect(FORBIDDEN.test(s), JSON.stringify(label)).toBe(false)
      expect(s, JSON.stringify(label)).toMatch(SLUG)
      expect(s.length, JSON.stringify(label)).toBeLessThanOrEqual(60)
    }
  })

  it('a name with nothing in it is « plan », not an empty piece of a file name', () => {
    for (const label of ['', '   ', '---', '()', '🙂', '/:*?']) expect(csvLabel(label), JSON.stringify(label)).toBe('plan')
  })

  it('cutting a long name never leaves a hyphen at the end', () => {
    const long = `${'mot '.repeat(40)}fin`
    expect(csvLabel(long).endsWith('-')).toBe(false)
    expect(csvLabel(long).length).toBeLessThanOrEqual(60)
  })
})

describe('the two names the copy builds around it', () => {
  it('French and English, pinned', () => {
    expect(RESULTS_COPY.fr.out.csvFile('Retirer-à-60-ans')).toBe('horizon-annee-par-annee-Retirer-à-60-ans.csv')
    expect(RESULTS_COPY.en.out.csvFile('Retire-at-60')).toBe('horizon-year-by-year-Retire-at-60.csv')
  })

  it('whatever the scenario, the whole file name is clean, in both languages', () => {
    for (const label of ['Retirer à 60 ans', 'A/B:C', '', 'x'.repeat(200)]) {
      for (const lang of ['fr', 'en'] as const) {
        const name = RESULTS_COPY[lang].out.csvFile(csvLabel(label))
        expect(FORBIDDEN.test(name), name).toBe(false)
        expect(name.endsWith('.csv')).toBe(true)
        expect(name.startsWith('horizon-')).toBe(true)
      }
    }
  })
})

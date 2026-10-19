import { describe, expect, it } from 'vitest'
import { countedFigures, countFrame } from './countUp.ts'

const nbsp = (s: string) => s.replace(new RegExp('[' + String.fromCharCode(0xa0, 0x202f) + ']', 'g'), ' ')

describe('which figures count up', () => {
  it('an amount does; an age, a percentage and a year do not', () => {
    expect(countedFigures('Il faudrait mettre de côté 15 000 $ de plus par année.')).toEqual([15000])
    expect(countedFigures('À 62 ans, jusqu’à 7 800 $ par mois, 22 % de vos dépenses, en 2039.')).toEqual([7800])
    expect(countedFigures('1 507,65 $')).toEqual([1507.65])
    expect(countedFigures('Pas de chiffre')).toEqual([])
  })
})

describe('the frames between', () => {
  it('starts from zero, lands on the text itself, and keeps the words and the small numbers whole', () => {
    const text = 'À 62 ans : 7 800 $ par mois.'
    expect(nbsp(countFrame(text, null, 0, 'fr'))).toBe('À 62 ans : 0 $ par mois.')
    expect(countFrame(text, null, 1, 'fr')).toBe(text)
    expect(nbsp(countFrame(text, null, 0.5, 'fr'))).toBe('À 62 ans : 3 900 $ par mois.')
  })

  it('moves from where it was, not from zero, when the figure changes', () => {
    expect(nbsp(countFrame('12 000 $', [10000], 0.5, 'fr'))).toBe('11 000 $')
  })

  it('never draws a figure outside its two ends — a progress below zero is the start (a frame stamped before the count began, on a slow machine: « À -18 $ » on CI)', () => {
    const text = 'À 40 000 $ par année : dès 52 ans.'
    expect(nbsp(countFrame(text, null, -0.004, 'fr'))).toBe('À 0 $ par année : dès 52 ans.')
    expect(nbsp(countFrame('12 000 $', [10000], -0.5, 'fr'))).toBe('10 000 $')
  })

  it('keeps the cents of a figure that has them, in either language', () => {
    expect(nbsp(countFrame('1 000,50 $', null, 0.5, 'fr'))).toBe('500,25 $')
    expect(countFrame('$1,000.50', null, 0.5, 'en')).toBe('$500.25')
  })
})

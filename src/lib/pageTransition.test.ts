import { describe, expect, it } from 'vitest'
import { transitionKind } from './pageTransition.ts'

describe('which way a page change slides', () => {
  it('along the tabs: forward to the right of where you are, back to the left', () => {
    expect(transitionKind('/profil', '/resultats')).toBe('forward')
    expect(transitionKind('/resultats', '/hypotheses')).toBe('forward')
    expect(transitionKind('/profil', '/hypotheses')).toBe('forward')
    expect(transitionKind('/hypotheses', '/profil')).toBe('back')
  })

  it('anything else is a fade — the sheet, the glossary, the settings, the front door, the same page', () => {
    expect(transitionKind('/profil', '/glossaire')).toBe('fade')
    expect(transitionKind('/', '/profil')).toBe('fade')
    expect(transitionKind('/resultats', '/resultats')).toBe('fade')
  })
})

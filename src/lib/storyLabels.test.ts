import { describe, expect, it } from 'vitest'
import { STORY_LABELS } from './storyLabels.ts'

describe('the words around a plain-language text', () => {
  it('exist in both languages, say something, and type no figure', () => {
    for (const lang of ['fr', 'en'] as const)
      for (const [key, text] of Object.entries(STORY_LABELS[lang])) {
        expect(text.trim(), `${lang} ${key}`).not.toBe('')
        expect(text, `${lang} ${key}`).not.toMatch(/\d/)
      }
    expect(Object.keys(STORY_LABELS.fr).sort()).toEqual(Object.keys(STORY_LABELS.en).sort())
  })
})

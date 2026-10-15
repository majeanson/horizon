import { describe, expect, it } from 'vitest'
import { CARD_COPY, type CardId } from './cardCopy'

// The sentence under a card's title is ONE sentence (the card anatomy, components/profile/shared.tsx): a second one belongs in « En savoir plus ».

describe('the one sentence under each card', () => {
  const ids = Object.keys(CARD_COPY.fr) as CardId[]

  it('exists in both languages, translated', () => {
    expect(Object.keys(CARD_COPY.en).sort()).toEqual([...ids].sort())
    for (const id of ids) expect(CARD_COPY.en[id], id).not.toBe(CARD_COPY.fr[id])
  })

  it('is one short sentence', () => {
    for (const lang of ['fr', 'en'] as const)
      for (const id of ids) {
        const s = CARD_COPY[lang][id]
        // one end mark, at the end (a question counts as the sentence)
        expect(s.match(/[.?!]/g)?.length ?? 0, `${lang}.${id}: ${s}`).toBe(1)
        expect(s, `${lang}.${id}`).toMatch(/[.?!]$/)
        expect(s.length, `${lang}.${id}`).toBeLessThanOrEqual(90)
      }
  })
})

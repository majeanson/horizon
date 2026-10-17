import jsQR from 'jsqr'
import { describe, expect, it } from 'vitest'
import { QR_MAX_BYTES, qrMatrix, qrPath } from './qr.ts'
import { shareUrl } from './shareLink.ts'

// THE QR ENCODER IS HELD BY A DECODER IT DID NOT WRITE. A code that looks right and scans wrong is the worst kind of wrong, so every test draws the matrix as pixels and reads it back with
// jsQR (a dev-only dependency: it never ships). The tables in qr.ts are not trusted; the decoder is.

/** The matrix as RGBA pixels, `scale` pixels a module, with the four-module quiet zone. */
function pixels(matrix: boolean[][], scale = 4): { data: Uint8ClampedArray; side: number } {
  const quiet = 4
  const side = (matrix.length + quiet * 2) * scale
  const data = new Uint8ClampedArray(side * side * 4).fill(255)
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark) return
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          const i = (((y + quiet) * scale + dy) * side + (x + quiet) * scale + dx) * 4
          data[i] = data[i + 1] = data[i + 2] = 0
        }
    }),
  )
  return { data, side }
}

const decode = (text: string): string | null => {
  const { data, side } = pixels(qrMatrix(text))
  return jsQR(data, side, side)?.data ?? null
}

describe('what it draws, a decoder reads back', () => {
  const samples = [
    'a',
    'https://example.org',
    'x'.repeat(14), // the last that fits version 1
    'y'.repeat(15), // the first of version 2
    'z'.repeat(26),
    'w'.repeat(27),
    'Horizon — où est ma retraite? é à ç',
    'a'.repeat(42),
    'b'.repeat(43),
    'c'.repeat(62),
    'd'.repeat(63),
    'e'.repeat(84),
    'f'.repeat(85),
    'g'.repeat(106),
    'https://retraite.marcportal.com/partage?age=62&foyer=couple&l=fr',
    'https://retraite.marcportal.com/partage?age=18&foyer=seul&l=en',
  ]
  for (const text of samples) {
    it(`${text.length} bytes: ${text.slice(0, 30)}`, () => {
      expect(decode(text)).toBe(text)
    })
  }

  it('every share link the app can write', () => {
    for (const lang of ['fr', 'en'] as const)
      for (const home of ['seul', 'couple'] as const)
        for (const age of [18, 55, 62, 65, 70]) {
          const url = shareUrl('https://retraite.marcportal.com', { age, home, lang })
          expect(decode(url), url).toBe(url)
        }
  })
})

describe('its edges', () => {
  it('a message past the last version is refused, not truncated', () => {
    expect(() => qrMatrix('h'.repeat(QR_MAX_BYTES + 1))).toThrow(/do not fit/)
    expect(decode('h'.repeat(QR_MAX_BYTES))).toBe('h'.repeat(QR_MAX_BYTES))
  })

  it('counts bytes, not characters', () => {
    expect(() => qrMatrix('é'.repeat(54))).toThrow() // 108 bytes
    expect(decode('é'.repeat(53))).toBe('é'.repeat(53)) // 106 bytes
  })

  it('is deterministic and the side grows with the version', () => {
    expect(qrMatrix('same')).toEqual(qrMatrix('same'))
    expect(qrMatrix('a').length).toBe(21)
    expect(qrMatrix('a'.repeat(106)).length).toBe(17 + 4 * 6)
  })

  it('the three corners carry a finder pattern', () => {
    const m = qrMatrix('https://example.org/finders')
    const n = m.length
    for (const [x, y] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) {
        const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3))
        expect(m[y + dy][x + dx], `${x},${y} ${dx},${dy}`).toBe(ring !== 2)
      }
    }
  })

  it('a wrong code does not decode to the right text (the decoder is not agreeing with everything)', () => {
    const m = qrMatrix('https://example.org/flip')
    const flipped = m.map((r) => r.slice())
    for (let i = 9; i < m.length - 9; i++) for (let j = 9; j < m.length - 9; j++) flipped[i][j] = !flipped[i][j]
    const { data, side } = pixels(flipped)
    expect(jsQR(data, side, side)?.data ?? null).not.toBe('https://example.org/flip')
  })
})

describe('the path', () => {
  it('draws exactly the dark modules, with a quiet zone of four', () => {
    const m = qrMatrix('path')
    const { d, size } = qrPath(m)
    expect(size).toBe(m.length + 8)
    const dark = [...d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)].reduce((s, x) => s + Number(x[3]), 0)
    expect(dark).toBe(m.flat().filter(Boolean).length)
    for (const x of d.matchAll(/M(\d+) (\d+)h(\d+)/g)) {
      expect(Number(x[1])).toBeGreaterThanOrEqual(4)
      expect(Number(x[1]) + Number(x[3])).toBeLessThanOrEqual(size - 4)
    }
  })
})

// A QR CODE ENCODER, small on purpose: byte mode, error correction level M, versions 1 to 6 (up to 106 bytes), which is what one address of this app needs and no more. It is the
// only thing that draws a code, so the share link can sit on a printed page as something a phone can scan — without a library, without a network, and without a profile figure in it
// (the link carries an age, a household type and a language: lib/shareLink.ts). Pure; the layout follows the ISO/IEC 18004 tables, and `qr.test.ts` decodes what it draws with an
// independent decoder (a dev-only dependency) rather than trusting the tables.

/** Data bytes each version holds at level M, after the mode and length bits. */
const CAPACITY = [14, 26, 42, 62, 84, 106] as const
/** Version → data codewords, error-correction codewords per block, blocks (level M). */
const BLOCKS: readonly { data: number; ec: number; blocks: number }[] = [
  { data: 16, ec: 10, blocks: 1 },
  { data: 28, ec: 16, blocks: 1 },
  { data: 44, ec: 26, blocks: 1 },
  { data: 64, ec: 18, blocks: 2 },
  { data: 86, ec: 24, blocks: 2 },
  { data: 108, ec: 16, blocks: 4 },
]
/** Alignment pattern centres, by version (version 1 has none). */
const ALIGNMENT: readonly (readonly number[])[] = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]]

export const QR_MAX_BYTES = CAPACITY[CAPACITY.length - 1]

// GF(256) with the polynomial 0x11D.
const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]
}
const mul = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]])

/** The Reed–Solomon remainder of `data` for a generator of degree `degree`. */
function reedSolomon(data: readonly number[], degree: number): number[] {
  let gen = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(gen.length + 1).fill(0)
    gen.forEach((c, j) => {
      next[j] ^= c
      next[j + 1] ^= mul(c, EXP[i])
    })
    gen = next
  }
  // `gen` holds the coefficients from x^degree down to 1; the division keeps a running remainder of `degree` bytes.
  const rem = new Array<number>(degree).fill(0)
  for (const b of data) {
    const factor = b ^ rem[0]
    rem.shift()
    rem.push(0)
    for (let i = 0; i < degree; i++) rem[i] ^= mul(gen[i + 1], factor)
  }
  return rem
}

/** The codewords of a message: the bits, padded, split into blocks, each with its error correction, interleaved. */
function codewords(bytes: Uint8Array, version: number): number[] {
  const { data, ec, blocks } = BLOCKS[version - 1]
  const bits: number[] = []
  const push = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1)
  }
  push(0b0100, 4)
  push(bytes.length, 8)
  for (const b of bytes) push(b, 8)
  push(0, Math.min(4, data * 8 - bits.length))
  while (bits.length % 8 !== 0) bits.push(0)
  const words: number[] = []
  for (let i = 0; i < bits.length; i += 8) words.push(parseInt(bits.slice(i, i + 8).join(''), 2))
  for (let pad = 0xec; words.length < data; pad ^= 0xec ^ 0x11) words.push(pad)
  const per = data / blocks
  const dataBlocks = Array.from({ length: blocks }, (_, i) => words.slice(i * per, (i + 1) * per))
  const ecBlocks = dataBlocks.map((b) => reedSolomon(b, ec))
  const out: number[] = []
  for (let i = 0; i < per; i++) for (const b of dataBlocks) out.push(b[i])
  for (let i = 0; i < ec; i++) for (const b of ecBlocks) out.push(b[i])
  return out
}

type Grid = boolean[][]

const maskCondition = (mask: number, x: number, y: number): boolean => {
  switch (mask) {
    case 0: return (x + y) % 2 === 0
    case 1: return y % 2 === 0
    case 2: return x % 3 === 0
    case 3: return (x + y) % 3 === 0
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0
    case 6: return ((((x * y) % 2) + ((x * y) % 3)) % 2) === 0
    default: return ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0
  }
}

/** The 15 format bits of level M and a mask: 5 data bits, a BCH(15,5) remainder, XOR 0x5412. */
function formatBits(mask: number): number {
  const data = (0b00 << 3) | mask
  let rem = data
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
  return ((data << 10) | rem) ^ 0x5412
}

/** Writes the two copies of the format bits and the one dark module that always stays dark, through `set` (column, row, dark). */
function drawFormat(set: (x: number, y: number, dark: boolean) => void, mask: number, n: number): void {
  const bits = formatBits(mask)
  const bit = (i: number) => ((bits >>> i) & 1) === 1
  for (let i = 0; i <= 5; i++) set(8, i, bit(i))
  set(8, 7, bit(6))
  set(8, 8, bit(7))
  set(7, 8, bit(8))
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i))
  for (let i = 0; i < 8; i++) set(n - 1 - i, 8, bit(i))
  for (let i = 8; i < 15; i++) set(8, n - 15 + i, bit(i))
  set(8, n - 8, true)
}

function penalty(m: Grid): number {
  const n = m.length
  let score = 0
  // 1 — runs of five or more of one colour, in rows and in columns
  for (const get of [(a: number, b: number) => m[a][b], (a: number, b: number) => m[b][a]]) {
    for (let a = 0; a < n; a++) {
      let run = 1
      for (let b = 1; b < n; b++) {
        if (get(a, b) === get(a, b - 1)) run++
        else {
          if (run >= 5) score += 3 + (run - 5)
          run = 1
        }
      }
      if (run >= 5) score += 3 + (run - 5)
    }
  }
  // 2 — 2 × 2 blocks of one colour
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3
  // 3 — a finder-like 1:1:3:1:1 run with four light modules on one side
  const A = [true, false, true, true, true, false, true, false, false, false, false]
  const B = [false, false, false, false, true, false, true, true, true, false, true]
  const at = (row: boolean[], i: number, p: boolean[]) => p.every((v, k) => row[i + k] === v)
  for (let y = 0; y < n; y++) {
    const col = m.map((r) => r[y])
    for (let i = 0; i + 11 <= n; i++) {
      if (at(m[y], i, A) || at(m[y], i, B)) score += 40
      if (at(col, i, A) || at(col, i, B)) score += 40
    }
  }
  // 4 — the share of dark modules away from half
  const dark = m.reduce((s, r) => s + r.filter(Boolean).length, 0)
  score += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10
  return score
}

/** The modules of the code for `text` (true = dark), without the quiet zone. Throws when the text is longer than `QR_MAX_BYTES`. */
export function qrMatrix(text: string): Grid {
  const bytes = new TextEncoder().encode(text)
  const version = CAPACITY.findIndex((c) => bytes.length <= c) + 1
  if (version === 0) throw new Error(`qr: ${bytes.length} bytes do not fit (the most is ${QR_MAX_BYTES})`)
  const n = 17 + 4 * version
  const modules: Grid = Array.from({ length: n }, () => new Array<boolean>(n).fill(false))
  const fixed: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false))
  const put = (x: number, y: number, dark: boolean) => {
    if (x < 0 || y < 0 || x >= n || y >= n) return
    modules[y][x] = dark
    fixed[y][x] = true
  }
  for (let i = 0; i < n; i++) {
    put(6, i, i % 2 === 0)
    put(i, 6, i % 2 === 0)
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) put(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 2 && Math.max(Math.abs(dx), Math.abs(dy)) !== 4)
  }
  finder(3, 3)
  finder(n - 4, 3)
  finder(3, n - 4)
  const centres = ALIGNMENT[version - 1]
  centres.forEach((cy, i) =>
    centres.forEach((cx, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === centres.length - 1) || (i === centres.length - 1 && j === 0)) return
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) put(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
    }),
  )
  // the format areas are reserved (and drawn properly, with the chosen mask, below)
  drawFormat(put, 0, n)
  // the data, in the two-column zigzag from the bottom right, skipping the timing column
  const words = codewords(bytes, version)
  let k = 0
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < n; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const y = ((right + 1) & 2) === 0 ? n - 1 - vert : vert
        if (!fixed[y][x] && k < words.length * 8) {
          modules[y][x] = ((words[k >>> 3] >>> (7 - (k & 7))) & 1) === 1
          k++
        }
      }
    }
  }
  // the mask with the lowest penalty
  let best: Grid | null = null
  let bestScore = Infinity
  for (let mask = 0; mask < 8; mask++) {
    const trial = modules.map((r) => r.slice())
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fixed[y][x] && maskCondition(mask, x, y)) trial[y][x] = !trial[y][x]
    drawFormat((x, y, dark) => {
      trial[y][x] = dark
    }, mask, n)
    const score = penalty(trial)
    if (score < bestScore) {
      bestScore = score
      best = trial
    }
  }
  return best!
}

/** The code as one SVG path (a square per dark module, `scale` user units wide), with a four-module quiet zone around it: `size` is the side of the whole picture. */
export function qrPath(matrix: Grid): { d: string; size: number } {
  const quiet = 4
  const parts: string[] = []
  matrix.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (!row[x]) {
        x++
        continue
      }
      let end = x
      while (end < row.length && row[end]) end++
      parts.push(`M${x + quiet} ${y + quiet}h${end - x}v1h-${end - x}z`)
      x = end
    }
  })
  return { d: parts.join(''), size: matrix.length + quiet * 2 }
}

// Renders the link-preview cards for shared scenarios: `npm run og` → public/og/*.png (committed, then served by worker/shareRoutes.ts).
//
// WHY AT BUILD TIME AND NOT IN THE WORKER. A card is a pure function of three small things (an age from 18 to 70, one person or two, French or
// English), so every card that can ever be asked for is 212 files. Drawing text to a PNG inside a Worker (satori + resvg-wasm) costs real CPU per
// request, and a burst of distinct shares is exactly when a Worker dies at its CPU limit (error 1102). Rendered here once, the route is a static file
// read: it cannot run out of CPU, needs no cache and has no cold start. `shareLink.test.ts` fails if a card is missing or the set drifts.
//
// satori turns markup into an SVG whose text is already outlines (no font is needed afterwards); sharp rasterises that and quantises to a palette,
// since a flat two-colour card needs no more (about 10 KB each). Fonts are the app's own, from @fontsource.
//
// Run with Node (type stripping): erasable syntax only, explicit `.ts` on relative imports.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import satori from 'satori'
import sharp from 'sharp'
import { SHARE_COPY } from '../src/lib/shareCopy.ts'
import { allShares, ogFile, ogGenericFile, type Share, type ShareLang } from '../src/lib/shareLink.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public')

const font = (pkg: string, file: string) => readFileSync(join(root, 'node_modules', '@fontsource', pkg, 'files', file))
const FONTS = [
  { name: 'Baloo 2', data: font('baloo-2', 'baloo-2-latin-800-normal.woff'), weight: 800 as const, style: 'normal' as const },
  { name: 'Hanken Grotesk', data: font('hanken-grotesk', 'hanken-grotesk-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
  { name: 'Hanken Grotesk', data: font('hanken-grotesk', 'hanken-grotesk-latin-600-normal.woff'), weight: 600 as const, style: 'normal' as const },
]

// The app's day palette (public/manifest, styles/core.css).
const PAPER = '#FBF3E4'
const INK = '#3c3730'
const SOFT = '#5f574a'
const ACCENT = '#E8A33D'

const h = (style: Record<string, unknown>, children: unknown) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } })

interface Card {
  /** The big sentence, or — when `big` is set — the lead above it. */
  headline: string
  /** The one figure drawn very large under the lead (the age). */
  big?: string
  /** The line under it. */
  sub: string
  /** The small print at the foot. */
  note: string
  site: string
}

// Text only, deliberately: three blocks and a bar. Minimal markup keeps the render cheap and the card legible at thumbnail size.
const tree = (c: Card) =>
  h({ width: 1200, height: 630, backgroundColor: PAPER, flexDirection: 'row' }, [
    h({ width: 28, height: 630, backgroundColor: ACCENT }, ''),
    h({ flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', flexGrow: 1 }, [
      h({ fontFamily: 'Baloo 2', fontWeight: 800, fontSize: 48, color: INK }, c.site),
      h({ flexDirection: 'column' }, [
        h({ fontFamily: 'Baloo 2', fontWeight: 800, fontSize: c.big ? 64 : 88, lineHeight: 1.05, color: INK }, c.headline),
        ...(c.big ? [h({ fontFamily: 'Baloo 2', fontWeight: 800, fontSize: 220, lineHeight: 1, color: INK }, c.big)] : []),
        h({ fontFamily: 'Hanken Grotesk', fontWeight: 600, fontSize: 44, color: SOFT, marginTop: 24 }, c.sub),
      ]),
      h({ fontFamily: 'Hanken Grotesk', fontWeight: 400, fontSize: 32, color: SOFT }, c.note),
    ]),
  ])

async function render(c: Card, file: string): Promise<void> {
  const svg = await satori(tree(c) as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts: FONTS })
  const png = await sharp(Buffer.from(svg)).png({ palette: true, compressionLevel: 9 }).toBuffer()
  const to = join(outDir, file)
  mkdirSync(dirname(to), { recursive: true })
  writeFileSync(to, png)
}

const GENERIC: Record<ShareLang, { headline: string; sub: string; note: string }> = {
  fr: { headline: 'Quand pouvez-vous prendre votre retraite ?', sub: 'Un planificateur pour le Québec', note: 'Vos données restent sur votre appareil.' },
  en: { headline: 'When can you retire?', sub: 'A planner for Québec', note: 'Your data stays on your device.' },
}

const cardOf = (s: Share): Card => {
  const c = SHARE_COPY[s.lang]
  return { headline: c.cardLead, big: c.cardAge(s.age), sub: c.cardHome[s.home], note: c.cardNote, site: c.siteName }
}

const jobs: Array<[Card, string]> = [
  ...(['fr', 'en'] as const).map((lang): [Card, string] => [
    { headline: GENERIC[lang].headline, sub: GENERIC[lang].sub, note: GENERIC[lang].note, site: SHARE_COPY[lang].siteName },
    ogGenericFile(lang),
  ]),
  ...allShares().map((s): [Card, string] => [cardOf(s), ogFile(s)]),
]

// A few at a time: satori is quick, sharp is the slow half, and 212 in parallel is memory for nothing.
const POOL = 6
let next = 0
await Promise.all(
  Array.from({ length: POOL }, async () => {
    while (next < jobs.length) {
      const [card, file] = jobs[next++]
      await render(card, file)
    }
  }),
)
console.log(`gen-og: ${jobs.length} cards → public/og/`)

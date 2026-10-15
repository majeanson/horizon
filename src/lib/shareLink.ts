// THE SHARE LINK: the one place a result is written into an address, and read back out of one.
//
// A household's profile never leaves the device (CLAUDE.md law 3), so a shared result carries only what a person would say
// aloud across the table: the age that works, and whether the plan is for one person or two. Three small parameters, all
// validated on the way in, none of them a figure from the profile:
//
//   /partage?age=62&foyer=couple&l=fr
//
// The same module is read by the page (src/pages/Partage.tsx) and by the Worker (worker/shareRoutes.ts, which writes the
// link-preview tags and finds the card image), so it imports NOTHING — not even a type from the app — and the age bounds are
// restated here and pinned to the engine's own by shareLink.test.ts.

export type ShareLang = 'fr' | 'en'
export type ShareHome = 'seul' | 'couple'

export interface Share {
  /** The earliest age at which the money lasts. */
  age: number
  home: ShareHome
  lang: ShareLang
}

/** The ages the engine tries (resultsModel MIN_AGE … MAX_AGE); a link outside them is not one of ours. */
export const SHARE_MIN_AGE = 18
export const SHARE_MAX_AGE = 70

export const SHARE_PATH = '/partage'
/** The card image: `/og/scenario?age=62&foyer=couple&l=fr` → a 1200 × 630 PNG. */
export const OG_PATH = '/og/scenario'

const PARAMS = { age: 'age', home: 'foyer', lang: 'l' } as const

/** What a query string says, or null when it is not a share link (a missing, non-integer or out-of-range age; an unknown household). The language defaults to French. */
export function parseShare(search: string | URLSearchParams): Share | null {
  const p = typeof search === 'string' ? new URLSearchParams(search) : search
  const raw = p.get(PARAMS.age)
  if (raw === null || !/^\d{2}$/.test(raw)) return null
  const age = Number(raw)
  if (age < SHARE_MIN_AGE || age > SHARE_MAX_AGE) return null
  const home = p.get(PARAMS.home)
  if (home !== 'seul' && home !== 'couple') return null
  return { age, home, lang: p.get(PARAMS.lang) === 'en' ? 'en' : 'fr' }
}

const query = (s: Share): string => `${PARAMS.age}=${s.age}&${PARAMS.home}=${s.home}&${PARAMS.lang}=${s.lang}`

/** The address a person sends. `origin` is `location.origin` in the app. */
export const shareUrl = (origin: string, s: Share): string => `${origin}${SHARE_PATH}?${query(s)}`

/** The card image's address for the same result. */
export const ogUrl = (origin: string, s: Share): string => `${origin}${OG_PATH}?${query(s)}`

/** Where the pre-rendered card for a result lives in the built assets (scripts/gen-og.ts writes exactly these names). */
export const ogFile = (s: Share): string => `/og/scenario-${s.lang}-${s.home}-${s.age}.png`

/** The card for a link that is not a share link, or when a rendered card is missing: one per language. */
export const ogGenericFile = (lang: ShareLang): string => `/og/horizon-${lang}.png`

/** Every result the card can show — what scripts/gen-og.ts renders, and what the completeness test counts. */
export function allShares(): Share[] {
  const out: Share[] = []
  for (const lang of ['fr', 'en'] as const)
    for (const home of ['seul', 'couple'] as const) for (let age = SHARE_MIN_AGE; age <= SHARE_MAX_AGE; age++) out.push({ age, home, lang })
  return out
}

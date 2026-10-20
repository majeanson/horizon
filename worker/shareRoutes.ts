// The two Worker routes behind « Partager ce scénario » (lib/shareLink.ts). Neither reads, stores or forwards anything: both are functions of the
// address alone, and an address holds an age, a household type and a language, validated before anything is built from it.
//
//   /partage?age=62&foyer=couple&l=fr  → the app's own index.html, with its link-preview tags rewritten for THAT result. The page is the same SPA
//                                        a browser always gets; only a crawler reads the tags (it runs no script).
//   /og/scenario?age=62&foyer=couple&l=fr → the card image: a PNG that scripts/gen-og.ts rendered at build time, one per possible result. It is a
//                                        static-file read, so there is no CPU to exhaust under a burst of distinct links.
//
// wrangler.toml lists both under `assets.run_worker_first`: a navigation to /partage would otherwise be answered with the SPA shell straight from
// the assets layer, and the tags would never be rewritten for the crawlers that do send navigation headers.

import { SHARE_COPY } from '../src/lib/shareCopy.ts'
import { OG_PATH, SHARE_PATH, ogFile, ogGenericFile, ogUrl, parseShare, shareUrl, type ShareLang } from '../src/lib/shareLink.ts'

interface AssetsEnv {
  ASSETS: Fetcher
}

const escapeAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const langOf = (url: URL): ShareLang => (url.searchParams.get('l') === 'en' ? 'en' : 'fr')

/** True for the two addresses this module answers (GET and HEAD only). */
export const isShareRoute = (request: Request, path: string): boolean => (request.method === 'GET' || request.method === 'HEAD') && (path === SHARE_PATH || path === OG_PATH)

/** The card for a result: its own PNG, or the generic one when the address names no valid result or the file is somehow absent. */
async function card(url: URL, env: AssetsEnv): Promise<Response> {
  const share = parseShare(url.searchParams)
  for (const file of [...(share ? [ogFile(share)] : []), ogGenericFile(langOf(url))]) {
    const res = await env.ASSETS.fetch(new Request(new URL(file, url)))
    // A missing file is NOT a 404 here: the assets layer answers it with the SPA shell (200, text/html).
    if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image/png')) {
      return new Response(res.body, {
        headers: {
          'content-type': 'image/png',
          // A card never changes for its address; a day at the edge and a week stale-while-revalidate is generous and safe.
          'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
          // A crawler or a chat client embeds it across origins; the page-wide `same-origin` policy would refuse that.
          'cross-origin-resource-policy': 'cross-origin',
        },
      })
    }
  }
  return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } })
}

const tag = (attr: 'property' | 'name', key: string, value: string): string => `<meta ${attr}="${key}" content="${escapeAttr(value)}">`

/** The shell, with the tags a link preview reads rewritten for this result (or untouched when the address is not a valid result). */
async function page(url: URL, env: AssetsEnv): Promise<Response> {
  const shell = await env.ASSETS.fetch(new Request(new URL('/', url)))
  const share = parseShare(url.searchParams)
  if (share === null || !shell.ok) return shell
  const c = SHARE_COPY[share.lang]
  const image = ogUrl(url.origin, share)
  const content = (value: string) => ({ element: (e: Element) => void e.setAttribute('content', value) })
  const rewriter = new HTMLRewriter()
    .on('html', { element: (e) => void e.setAttribute('lang', share.lang) })
    .on('title', { element: (e) => void e.setInnerContent(`${c.ogTitle(share.age)} · ${c.siteName}`) })
    .on('meta[name="description"]', content(c.ogDescription(share.home)))
    .on('meta[property="og:title"]', content(c.ogTitle(share.age)))
    .on('meta[property="og:description"]', content(c.ogDescription(share.home)))
    .on('meta[property="og:locale"]', content(share.lang === 'en' ? 'en_CA' : 'fr_CA'))
    .on('meta[name="twitter:card"]', content('summary_large_image'))
    .on('head', {
      element: (e) =>
        void e.append(
          [
            tag('property', 'og:url', shareUrl(url.origin, share)),
            tag('property', 'og:image', image),
            tag('property', 'og:image:type', 'image/png'),
            tag('property', 'og:image:width', '1200'),
            tag('property', 'og:image:height', '630'),
            tag('property', 'og:image:alt', c.ogAlt(share.age, share.home)),
            tag('name', 'twitter:image', image),
            // One page per age, household and language: a search engine has no reason to list them.
            tag('name', 'robots', 'noindex'),
          ].join(''),
          { html: true },
        ),
    })
  return rewriter.transform(shell)
}

/** The front door's card, for a link to `/` (Marc, 2026-10-19: « show a small preview image »). A crawler needs the image's FULL address, and the shell may
 *  hold none (lib/noNetwork.test.ts: index.html carries no absolute URL), so it is written here from the request's own origin — the generic card that
 *  scripts/gen-og.ts drew (public/og/), `ogGenericFile` in the reader's language. A function of the address (and of the language the request asks
 *  for), like the rest. */
/** The front door's language for a reader that runs no script (Marc, 2026-10-20: a preview reads ONE language, not FR + EN): `?l=` when the link
 *  names one, else the first of French or English the request accepts (by its q-values; q=0 is a refusal), else French, the shell's own. Most
 *  chat crawlers send no Accept-Language, so a link meant for an English reader says `?l=en`. */
export function frontDoorLang(url: URL, acceptLanguage: string | null): ShareLang {
  const asked = url.searchParams.get('l')
  if (asked === 'fr' || asked === 'en') return asked
  const ranked = (acceptLanguage ?? '')
    .split(',')
    .map((part) => {
      const [range, ...params] = part.trim().toLowerCase().split(';')
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
      return { range: range.trim(), q: q === undefined ? 1 : Number(q.slice(2)) || 0 }
    })
    .filter((r) => r.q > 0)
    .sort((a, b) => b.q - a.q)
  for (const { range } of ranked) {
    if (range === 'fr' || range.startsWith('fr-')) return 'fr'
    if (range === 'en' || range.startsWith('en-')) return 'en'
  }
  return 'fr'
}

export function withFrontDoorCard(shell: Response, url: URL, lang: ShareLang): Response {
  if (!shell.ok || !(shell.headers.get('content-type') ?? '').startsWith('text/html')) return shell
  const c = SHARE_COPY[lang]
  const image = new URL(ogGenericFile(lang), url.origin).href
  // The address the preview names keeps the language a link asked for: a crawler that re-reads og:url must land on the same words.
  const self = url.origin + '/' + (url.searchParams.has('l') ? `?l=${lang}` : '')
  const content = (value: string) => ({ element: (e: Element) => void e.setAttribute('content', value) })
  const res = new HTMLRewriter()
    .on('html', { element: (e) => void e.setAttribute('lang', lang) })
    // <meta name="description"> stays FR + EN: a search snippet is read by everyone, and the app narrows it once it runs (lib/documentLang.ts).
    .on('meta[property="og:description"]', content(c.ogGenericDescription))
    .on('meta[property="og:locale"]', content(lang === 'en' ? 'en_CA' : 'fr_CA'))
    .on('meta[property="og:locale:alternate"]', content(lang === 'en' ? 'fr_CA' : 'en_CA'))
    .on('meta[name="twitter:card"]', content('summary_large_image'))
    .on('head', {
      element: (e) =>
        void e.append(
          [
            tag('property', 'og:url', self),
            tag('property', 'og:image', image),
            tag('property', 'og:image:type', 'image/png'),
            tag('property', 'og:image:width', '1200'),
            tag('property', 'og:image:height', '630'),
            tag('property', 'og:image:alt', `${c.siteName} — ${c.ogGenericDescription}`),
            tag('name', 'twitter:image', image),
          ].join(''),
          { html: true },
        ),
    })
    .transform(shell)
  // The page now depends on Accept-Language as well as the address: a cache in between must not hand one reader's language to the other.
  res.headers.append('Vary', 'Accept-Language')
  return res
}

export function shareRoute(request: Request, env: AssetsEnv): Promise<Response> {
  const url = new URL(request.url)
  return url.pathname === OG_PATH ? card(url, env) : page(url, env)
}

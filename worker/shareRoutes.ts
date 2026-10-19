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
    // The shell already carries the front door's card (index.html: its image, type, size and alt): THIS result's card takes its place, never a second one.
    .on('meta[property="og:image"]', content(image))
    .on('meta[property="og:image:alt"]', content(c.ogAlt(share.age, share.home)))
    .on('meta[name="twitter:image"]', content(image))
    .on('head', {
      element: (e) =>
        void e.append(
          [
            tag('property', 'og:url', shareUrl(url.origin, share)),
            // One page per age, household and language: a search engine has no reason to list them.
            tag('name', 'robots', 'noindex'),
          ].join(''),
          { html: true },
        ),
    })
  return rewriter.transform(shell)
}

export function shareRoute(request: Request, env: AssetsEnv): Promise<Response> {
  const url = new URL(request.url)
  return url.pathname === OG_PATH ? card(url, env) : page(url, env)
}

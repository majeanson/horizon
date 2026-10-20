import { withSecurityHeaders } from './securityHeaders'
import { frontDoorLang, isShareRoute, shareRoute, withFrontDoorCard } from './shareRoutes'

// The whole backend: serve the built SPA from the ASSETS binding. There is no /api — the
// profile never leaves the browser — so this file is deliberately tiny, and the fact that it
// has nothing else to do is part of the product's privacy story. (The one addition, worker/shareRoutes.ts, is a
// function of the ADDRESS alone: link-preview tags and a card image for a shared result. It reads nothing.)
interface Env {
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // The assets binding serves a real file when one matches, else index.html (the SPA
    // fallback) so a client-side route like /resultats survives a reload.
    const path = new URL(request.url).pathname
    if (isShareRoute(request, path)) {
      const shared = withSecurityHeaders(await shareRoute(request, env))
      // The card is fetched across origins by whoever unfurls the link; withSecurityHeaders' same-origin policy would refuse it.
      if (path !== '/partage') shared.headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
      return shared
    }
    const res = await env.ASSETS.fetch(request)
    // The front door carries its link card, written from the origin in ONE language (worker/shareRoutes.ts `withFrontDoorCard`; `/` is in run_worker_first for this).
    if (path === '/' && (request.method === 'GET' || request.method === 'HEAD')) {
      const url = new URL(request.url)
      return withSecurityHeaders(withFrontDoorCard(res, url, frontDoorLang(url, request.headers.get('accept-language'))))
    }

    // …but /assets/* is the hashed build output, never a client route, so the SPA fallback is
    // WRONG there: a stale shell asking for a previous build's chunk would get 200 + index.html
    // instead of a 404. The browser would parse HTML as a module, React would never mount, and
    // a cache-first service worker would then keep serving that poison. A hashed asset that is
    // gone is a 404, never a page.
    if (path.startsWith('/assets/') && (res.headers.get('content-type') ?? '').includes('text/html')) {
      return withSecurityHeaders(new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } }))
    }
    return withSecurityHeaders(res)
  },
}

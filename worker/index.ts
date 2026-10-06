import { withSecurityHeaders } from './securityHeaders'

// The whole backend: serve the built SPA from the ASSETS binding. There is no /api — the
// profile never leaves the browser — so this file is deliberately tiny, and the fact that it
// has nothing else to do is part of the product's privacy story.
interface Env {
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // The assets binding serves a real file when one matches, else index.html (the SPA
    // fallback) so a client-side route like /resultats survives a reload.
    const res = await env.ASSETS.fetch(request)
    const path = new URL(request.url).pathname

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

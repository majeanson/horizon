import { describe, expect, it } from 'vitest'
import { ENFORCED, headersFileSource } from './securityHeaders'

// Who may FRAME the app: itself and Marc's portfolio, nobody else. The allowlist lives in the CSP's `frame-ancestors`; X-Frame-Options is gone
// (it cannot list two origins, and a DENY next to the allowlist would refuse the portfolio in browsers that read XFO first).
const csp = ENFORCED.find(([name]) => name === 'Content-Security-Policy')![1]

describe('framing', () => {
  it('frame-ancestors allows only the app itself and marcportal.com', () => {
    expect(csp).toContain("frame-ancestors 'self' https://marcportal.com https://*.marcportal.com")
    expect(csp).not.toContain("frame-ancestors 'none'")
    expect(csp.match(/frame-ancestors/g)).toHaveLength(1)
  })

  it('sends no X-Frame-Options, on either delivery path', () => {
    expect(ENFORCED.some(([name]) => name.toLowerCase() === 'x-frame-options')).toBe(false)
    expect(headersFileSource().toLowerCase()).not.toContain('x-frame-options')
  })

  it('the static-asset path carries the same allowlist', () => {
    expect(headersFileSource()).toContain("frame-ancestors 'self' https://marcportal.com https://*.marcportal.com")
  })
})

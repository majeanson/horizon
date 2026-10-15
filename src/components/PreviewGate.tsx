import type { ReactNode } from 'react'
import { useLang } from '../i18n'
import { exampleProfile } from '../lib/example'
import { PREVIEW_COPY } from '../lib/previewCopy'
import { replaceProfile } from '../lib/store'
import { StatusMessage } from './StatusMessage'

// THE PORTFOLIO PREVIEW'S DOOR (lib/preview.ts). The shell loads this module ONLY on a `?apercu` visit, and renders the page inside it — so the
// invented household is in the store BEFORE the page's first render (this module's evaluation puts it there), and the frame never flashes an empty
// profile. Everything the preview needs (the example, its words) rides this one lazy chunk: an ordinary visit's first screen carries none of it.
// (replaceProfile saves at once — and in a preview, saving writes nothing: lib/store.ts.)
replaceProfile(exampleProfile('golden'))

// The one line above the page: an invented household, nothing saved — and the door to the real app in the WHOLE window (`target="_top"`: inside
// marcportal.com's frame, Horizon proper belongs in the tab, not in a 1280 × 800 box).
export default function PreviewGate({ children }: { children: ReactNode }) {
  const c = PREVIEW_COPY[useLang().lang]
  return (
    <>
      <div className="shell__notice preview-banner">
        <StatusMessage tone="info">{c.line}</StatusMessage>
        <a className="btn btn--sm" href="/" target="_top">
          {c.open}
        </a>
      </div>
      {children}
    </>
  )
}

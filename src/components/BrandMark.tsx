import { Icon } from './Icon'

// The brand's mark: a sun on the horizon, which is the whole name — the same drawing as the home-screen icon (scripts/make-icons.mjs) and the
// favicon. Decorative wherever it stands: the name « Horizon » is always written beside it, so the mark is hidden from assistive technology.
// Its colour is the marigold of the answer (styles/horizon.css `.brand-mark`), never the text's.
export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <span className="brand-mark" aria-hidden="true">
      <Icon name="sun-horizon-bold" size={size} />
    </span>
  )
}

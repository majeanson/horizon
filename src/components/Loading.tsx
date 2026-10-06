import { useT } from '../i18n'

// The waiting line for a surface whose shape is NOT known in advance — a whole route, a
// lazy chunk. For rows or a grid the reader can already picture, use <Skeleton> instead:
// a skeleton is a promise about shape, and this is the honest answer when there is none.
export function Loading() {
  const t = useT()
  return <p className="loading mono">{t.common.loading}</p>
}

import { Link, useSearchParams } from 'react-router-dom'
import { PageHead } from '../components/PageHead'
import { StatusMessage } from '../components/StatusMessage'
import { useLang } from '../i18n'
import { SHARE_COPY } from '../lib/shareCopy'
import { parseShare } from '../lib/shareLink'

// « Un scénario partagé » — where a share link lands (lib/shareLink.ts). It draws the summary the link carries, an age and a household type,
// and says plainly that these figures come from the address and not from the reader's own data: the way out is their own calculation.
// It reads no profile and writes nothing, so a visitor who has never used Horizon sees exactly what a returning household sees.
export function Partage() {
  const [params] = useSearchParams()
  const c = SHARE_COPY[useLang().lang]
  const share = parseShare(params)
  return (
    <section className="page-body share">
      <PageHead title={share ? c.pageTitle : c.brokenTitle} />
      {share ? (
        <div className="verdict surface results-section">
          <p className="verdict__line">
            <strong className="verdict__age">{c.headline(share.age)}</strong>
          </p>
          <p className="verdict__note">{c.home[share.home]}</p>
          <StatusMessage tone="info">{c.frame}</StatusMessage>
          <p className="verdict__note">{c.holds}</p>
        </div>
      ) : (
        <p className="verdict__note">{c.brokenBody}</p>
      )}
      <div className="welcome__go">
        <Link className="btn btn--primary" to="/">
          {c.cta}
        </Link>
      </div>
    </section>
  )
}

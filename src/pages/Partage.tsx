import { Link, useSearchParams } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { useLang } from '../i18n'
import { PageHead } from '../components/PageHead'
import { StatusMessage } from '../components/StatusMessage'
import { SHARE_COPY } from '../lib/shareCopy'
import { parseShare } from '../lib/shareLink'

// « Un scénario partagé » — where a share link lands (lib/shareLink.ts). It draws the summary the link carries, an age and a household type,
// and says plainly that these figures come from the address and not from the reader's own data: the way out is their own calculation.
// It reads no profile and writes nothing, so a visitor who has never used Horizon sees exactly what a returning household sees.
// The page speaks the language the SENDER wrote in (`l=`), not the reader's saved one — a link in French is opened to French — with one chip to read it in the other.
// (The shell around it, the bar and the tabs, stays in the reader's own language.)
export function Partage() {
  const [params] = useSearchParams()
  const share = parseShare(params)
  // a link with nothing readable in it has no sender's language: the reader's own
  const reader = useLang().lang
  const lang = share?.lang ?? reader
  const c = SHARE_COPY[lang]
  const other = lang === 'fr' ? 'en' : 'fr'
  const toOther = new URLSearchParams(params)
  toOther.set('l', other)
  return (
    <section className="page-body share" lang={share ? lang : undefined}>
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
      {share && (
        <Chip to={`?${toOther.toString()}`}>
          <span lang={other}>{c.otherLang}</span>
        </Chip>
      )}
      <p className="verdict__note">{c.pitch}</p>
      <div className="welcome__go">
        <Link className="btn btn--primary" to="/">
          {c.cta}
        </Link>
      </div>
    </section>
  )
}

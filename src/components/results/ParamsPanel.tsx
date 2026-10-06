import { useLang, useT } from '../../i18n'
import { knownYears, paramRows } from '../../lib/paramsView'

// « Paramètres utilisés »: every government figure the result stands on, one row each, with the official page it was
// read on and the day it was read. The rows are the same objects the engine reads (lib/paramsView.ts), so this panel
// cannot say anything the engine does not use. A figure not yet confirmed against an openable page says so. The page
// link and the number format follow the reader's language; a page the agency publishes in one language only is linked
// as it is and labelled.

export function ParamsPanel() {
  const t = useT()
  const { lang } = useLang()
  const r = t.results
  return (
    <>
      <p className="field-row__hint">{r.params.note}</p>
      {knownYears().map((year) => {
        const rows = paramRows(year, lang, r.params.entries)
        return (
          <div key={year} className="params">
            <h3 className="year-table__title">
              {r.params.year(year)} · {r.params.count(rows.length)}
            </h3>
            <div className="table-wrap" role="region" aria-label={r.params.year(year)} tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">{r.params.figure}</th>
                    <th scope="col">{r.params.value}</th>
                    <th scope="col">{r.params.source}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.path}>
                      <th scope="row" className="mono">
                        {row.path}
                      </th>
                      <td className="params__value">{row.value}</td>
                      <td>
                        <a href={row.url} target="_blank" rel="noopener noreferrer" lang={row.pageLang}>
                          {row.title}
                        </a>{' '}
                        {!row.inReaderLanguage && <span className="mono">({r.params.pageIn(row.pageLang)}) </span>}
                        <span className="mono">{r.params.retrieved(row.retrieved)}</span>
                        {row.verify && <span className="params__verify mono"> · {r.params.toVerify}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </>
  )
}

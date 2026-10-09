import { useLang, useT } from '../../i18n'
import { saveAsFile } from '../../lib/download'
import { LIFE_COPY } from '../../lib/lifeCopy'
import { longDate } from '../../lib/months'
import { exportFileName, exportProfileJson, getProfile, markExported, useLastExport } from '../../lib/store'
import { useNotice } from '../../lib/toast'
import { Chip } from '../Chip'

// « Dernière copie de sauvegarde : jamais » — one quiet line on Profil, with the one-tap way to make a copy. The shell's notice speaks up after an
// hour of unsaved typing; this line is there for the person who wants to know, at any time, where they stand.
export function BackupLine() {
  const { lang } = useLang()
  const t = useT()
  const notice = useNotice()
  const last = useLastExport()
  const c = LIFE_COPY[lang].backup
  const day = (ms: number): string => {
    const d = new Date(ms)
    return longDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, lang)
  }
  return (
    <div className="backup-line">
      <span>{last === null ? c.never : c.last(day(last))}</span>
      <Chip
        onClick={() => {
          saveAsFile(exportProfileJson(getProfile()), exportFileName())
          markExported()
          notice(t.data.export.done)
        }}
      >
        {c.now}
      </Chip>
    </div>
  )
}

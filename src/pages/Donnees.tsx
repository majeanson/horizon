import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cluster } from '../components/Layout'
import { PageHead } from '../components/PageHead'
import { Section } from '../components/profile/shared'
import { StatusMessage } from '../components/StatusMessage'
import { useT } from '../i18n'
import { useConfirm } from '../lib/confirm'
import { exampleProfile } from '../lib/example'
import { readProfileJson, type ReadResult } from '../lib/migrations'
import { clearProfile, exportFileName, exportProfileJson, getProfile, replaceProfile, useStorageIssue } from '../lib/store'
import { useNotice } from '../lib/toast'

// Where the data goes — which is nowhere. Export a file to keep, import one back, load the fictional example,
// or erase this device's copy. Every action that replaces the profile asks first, in words that say what is lost.
export function Donnees() {
  const t = useT()
  const d = t.data
  const confirm = useConfirm()
  const notice = useNotice()
  const issue = useStorageIssue()
  const fileInput = useRef<HTMLInputElement>(null)
  const [failure, setFailure] = useState<Extract<ReadResult, { ok: false }> | null>(null)

  const download = () => {
    const blob = new Blob([exportProfileJson(getProfile())], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFileName()
    a.click()
    URL.revokeObjectURL(url)
    notice(d.export.done)
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setFailure(null)
    const result = readProfileJson(await file.text())
    if (!result.ok) return setFailure(result)
    if (await confirm({ message: d.import.confirm, confirmLabel: d.import.confirmLabel, tone: 'default' })) {
      replaceProfile(result.profile)
      notice(d.import.done)
    }
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <section className="page-body">
      <PageHead title={d.title} subtitle={d.privacy} />
      {issue && <StatusMessage tone="info">{issue === 'unavailable' ? d.issue.unavailable : d.issue.unreadable}</StatusMessage>}

      <Section title={d.export.title} subtitle={d.export.hint} icon="download-simple-bold">
        <Cluster>
          <button type="button" className="btn" onClick={download}>
            {d.export.button}
          </button>
        </Cluster>
      </Section>

      <Section title={d.import.title} subtitle={d.import.hint} icon="upload-simple-bold">
        <Cluster>
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            {d.import.button}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-label={d.import.button}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </Cluster>
        {failure && (
          <div role="alert" className="import-errors">
            <StatusMessage tone="error">{failure.reason === 'json' ? d.import.notJson : failure.reason === 'newer' ? d.import.newer : d.import.problems}</StatusMessage>
            {failure.problems.length > 0 && failure.reason !== 'newer' && (
              <ul className="import-errors__list mono">
                {failure.problems.slice(0, 12).map((p) => (
                  <li key={p.path + p.problem}>
                    {p.path} — {d.import.problem[p.problem]}
                  </li>
                ))}
                {failure.problems.length > 12 && <li>…</li>}
              </ul>
            )}
          </div>
        )}
      </Section>

      <Section title={d.example.title} subtitle={d.example.hint} icon="user-bold">
        <Cluster>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={async () => {
              if (await confirm({ message: d.example.confirm, confirmLabel: d.example.confirmLabel, tone: 'default' })) {
                replaceProfile(exampleProfile())
                notice(d.example.done)
              }
            }}
          >
            {d.example.button}
          </button>
        </Cluster>
      </Section>

      <Section title={d.clear.title} subtitle={d.clear.hint} icon="trash-bold">
        <Cluster>
          <button
            type="button"
            className="btn btn--danger"
            onClick={async () => {
              if (await confirm({ message: d.clear.confirm, confirmLabel: d.clear.confirmLabel, tone: 'danger' })) {
                clearProfile()
                notice(d.clear.done)
              }
            }}
          >
            {d.clear.button}
          </button>
        </Cluster>
      </Section>

      <p className="data-foot mono">
        {d.build(__BUILD_SHA__)} · <Link to="/dev/kit">{d.kit}</Link>
      </p>
    </section>
  )
}

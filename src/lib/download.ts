// Hand a text to the browser as a file: the only way anything leaves this app, and it leaves to the person's own disk.
// Used by the data page (export, the unreadable copies), by the backup notice in the shell, which exports in one tap, and by the year table's spreadsheet.

/** How long the file's address stays valid after the click: the download is fetched AFTER click() returns (Safari, older Firefox). */
const REVOKE_AFTER_MS = 1000

export function saveAsFile(text: string, name: string, type = 'application/json'): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  // In the page while it is clicked (a detached link is ignored by some browsers), and its address kept a moment: revoked at once, iOS Safari fetched
  // nothing (« WebKitBlobResource ») while the page said the file was saved — the backup a person relies on, or the spreadsheet they asked for.
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS)
}

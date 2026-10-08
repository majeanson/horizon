// Hand a text to the browser as a file: the only way anything leaves this app, and it leaves to the person's own disk.
// Used by the data page (export, the unreadable copies) and by the backup notice in the shell, which exports in one tap.
export function saveAsFile(text: string, name: string, type = 'application/json'): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

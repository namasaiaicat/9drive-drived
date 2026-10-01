import JSZip from 'jszip'

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export async function createZipBlob(
  files: Array<{ name: string; blob: Blob }>
): Promise<Blob> {
  const zip = new JSZip()
  for (const file of files) {
    zip.file(file.name, file.blob)
  }
  return await zip.generateAsync({ type: 'blob' })
}

export async function bundleAndDownloadZip(
  files: Array<{ name: string; blob: Blob }>,
  zipFilename: string
): Promise<void> {
  const zipBlob = await createZipBlob(files)
  downloadBlob(zipBlob, zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`)
}

export async function extractZipFiles(
  zipFile: File
): Promise<Array<{ name: string; size: number; blob: Blob }>> {
  const zip = await JSZip.loadAsync(zipFile)
  const results: Array<{ name: string; size: number; blob: Blob }> = []

  for (const [relativePath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    const blob = await entry.async('blob')
    results.push({
      name: relativePath,
      size: blob.size,
      blob,
    })
  }
  return results
}


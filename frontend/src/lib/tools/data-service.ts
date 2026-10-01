export function csvToJson(csvText: string): string {
  const lines = csvText.trim().split(/\r\n|\n/)
  if (lines.length < 2) return '[]'

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''))
  const result: Array<Record<string, string>> = []

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i].trim()
    if (!currentLine) continue
    const obj: Record<string, string> = {}
    const currentValues = currentLine.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''))
    headers.forEach((header, index) => {
      obj[header] = currentValues[index] ?? ''
    })
    result.push(obj)
  }

  return JSON.stringify(result, null, 2)
}

export function jsonToCsv(jsonText: string): string {
  const data = JSON.parse(jsonText)
  if (!Array.isArray(data) || data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csvRows: string[] = []
  csvRows.push(headers.join(','))

  for (const row of data) {
    const values = headers.map((header) => {
      const escaped = ('' + (row[header] ?? '')).replace(/"/g, '""')
      return `"${escaped}"`
    })
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

export async function calculateHash(
  file: File,
  algorithm: 'SHA-256' | 'SHA-1' = 'SHA-256'
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest(algorithm, arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

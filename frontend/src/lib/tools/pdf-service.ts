import { PDFDocument, rgb, degrees, StandardFonts, PageSizes } from 'pdf-lib'

// Helper to convert hex to rgb (0-1 range for pdf-lib)
function hexToRgb(hex: string) {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0
  return { r, g, b }
}

export async function mergePdfs(files: File[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create()

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer()
    const donorPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
    const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices())
    for (const page of copiedPages) {
      mergedPdf.addPage(page)
    }
  }

  const mergedPdfBytes = await mergedPdf.save()
  return new Blob([mergedPdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
}

export async function splitPdf(
  file: File,
  pageRanges: string
): Promise<Array<{ name: string; blob: Blob }>> {
  const arrayBuffer = await file.arrayBuffer()
  const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const totalPages = srcPdf.getPageCount()
  const baseName = file.name.replace(/\.[^/.]+$/, '')

  // If pageRanges is empty or "all", extract each page individually
  if (!pageRanges.trim() || pageRanges.toLowerCase() === 'all') {
    const results: Array<{ name: string; blob: Blob }> = []
    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create()
      const [copiedPage] = await newPdf.copyPages(srcPdf, [i])
      newPdf.addPage(copiedPage)
      const bytes = await newPdf.save()
      results.push({
        name: `${baseName}_page_${i + 1}.pdf`,
        blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }),
      })
    }
    return results
  }

  // Parse ranges, e.g. "1-3, 5, 7-10"
  const segments = pageRanges.split(',').map((s) => s.trim()).filter(Boolean)
  const results: Array<{ name: string; blob: Blob }> = []

  let segmentIndex = 1
  for (const seg of segments) {
    const parts = seg.split('-').map((p) => parseInt(p.trim(), 10))
    let startPage = parts[0]
    let endPage = parts.length > 1 ? parts[1] : startPage

    if (isNaN(startPage) || startPage < 1) startPage = 1
    if (isNaN(endPage) || endPage > totalPages) endPage = totalPages
    if (startPage > totalPages) continue
    if (startPage > endPage) {
      const temp = startPage
      startPage = endPage
      endPage = temp
    }

    const pageIndices: number[] = []
    for (let p = startPage; p <= endPage; p++) {
      pageIndices.push(p - 1)
    }

    if (pageIndices.length === 0) continue

    const newPdf = await PDFDocument.create()
    const copiedPages = await newPdf.copyPages(srcPdf, pageIndices)
    for (const page of copiedPages) {
      newPdf.addPage(page)
    }
    const bytes = await newPdf.save()
    results.push({
      name: `${baseName}_part_${segmentIndex}_(p${startPage}-p${endPage}).pdf`,
      blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }),
    })
    segmentIndex++
  }

  if (results.length === 0) {
    throw new Error('No valid pages found in the specified range.')
  }

  return results
}

export async function compressPdf(
  file: File,
  _level: 'low' | 'medium' | 'high' = 'medium'
): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> {
  const arrayBuffer = await file.arrayBuffer()
  const originalSize = file.size

  // Load and re-save using pdf-lib with stream objects optimization
  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
    updateMetadata: false,
  })

  // Re-saving with useObjectStreams optimizes cross-reference table and streams
  const compressedBytes = await pdfDoc.save({ useObjectStreams: true })
  const blob = new Blob([compressedBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
  const compressedSize = blob.size

  return {
    blob,
    originalSize,
    compressedSize,
  }
}

export async function imagesToPdf(
  files: File[],
  options: {
    orientation: 'portrait' | 'landscape' | 'auto'
    pageSize: 'fit' | 'a4' | 'letter'
    margin: number
  }
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create()

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer()
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')
    let image
    try {
      if (isPng) {
        image = await pdfDoc.embedPng(arrayBuffer)
      } else {
        image = await pdfDoc.embedJpg(arrayBuffer)
      }
    } catch {
      // Fallback: draw image to canvas and export as jpeg
      const fallbackBytes = await new Promise<ArrayBuffer>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          if (!ctx) return reject(new Error('Canvas 2D context unavailable'))
          ctx.drawImage(img, 0, 0)
          canvas.toBlob((b) => {
            if (!b) return reject(new Error('Canvas blob conversion failed'))
            b.arrayBuffer().then(resolve).catch(reject)
          }, 'image/jpeg', 0.92)
        }
        img.onerror = () => reject(new Error('Failed to load image file'))
        img.src = URL.createObjectURL(file)
      })
      image = await pdfDoc.embedJpg(fallbackBytes)
    }

    const imgWidth = image.width
    const imgHeight = image.height

    let pageWidth = imgWidth
    let pageHeight = imgHeight

    if (options.pageSize === 'a4') {
      pageWidth = PageSizes.A4[0]
      pageHeight = PageSizes.A4[1]
    } else if (options.pageSize === 'letter') {
      pageWidth = PageSizes.Letter[0]
      pageHeight = PageSizes.Letter[1]
    }

    if (options.orientation === 'landscape' && pageWidth < pageHeight) {
      const tmp = pageWidth
      pageWidth = pageHeight
      pageHeight = tmp
    } else if (options.orientation === 'portrait' && pageWidth > pageHeight) {
      const tmp = pageWidth
      pageWidth = pageHeight
      pageHeight = tmp
    } else if (options.orientation === 'auto' && options.pageSize !== 'fit') {
      if (imgWidth > imgHeight && pageWidth < pageHeight) {
        const tmp = pageWidth
        pageWidth = pageHeight
        pageHeight = tmp
      }
    }

    const margin = options.margin
    const availableWidth = pageWidth - margin * 2
    const availableHeight = pageHeight - margin * 2

    const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight)
    const scaledWidth = imgWidth * scale
    const scaledHeight = imgHeight * scale

    const x = margin + (availableWidth - scaledWidth) / 2
    const y = margin + (availableHeight - scaledHeight) / 2

    const page = pdfDoc.addPage([pageWidth, pageHeight])
    page.drawImage(image, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight,
    })
  }

  const bytes = await pdfDoc.save()
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
}

export async function rotatePdf(
  file: File,
  rotations: Record<number, number>
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const pages = pdfDoc.getPages()

  pages.forEach((page, index) => {
    const angleToAdd = rotations[index] || 0
    if (angleToAdd !== 0) {
      const currentAngle = page.getRotation().angle
      page.setRotation(degrees((currentAngle + angleToAdd) % 360))
    }
  })

  const bytes = await pdfDoc.save()
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
}

export async function watermarkPdf(
  file: File,
  text: string,
  options: {
    opacity: number
    size: number
    colorHex: string
    angle: number
  }
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pages = pdfDoc.getPages()
  const { r, g, b } = hexToRgb(options.colorHex)

  for (const page of pages) {
    const { width, height } = page.getSize()
    const textWidth = font.widthOfTextAtSize(text, options.size)
    const textHeight = font.heightAtSize(options.size)

    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - textHeight / 2,
      size: options.size,
      font,
      color: rgb(r, g, b),
      opacity: options.opacity,
      rotate: degrees(options.angle),
    })
  }

  const bytes = await pdfDoc.save()
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
}

export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  return pdfDoc.getPageCount()
}

export async function compressImage(
  file: File,
  quality: number = 0.8,
  maxWidth?: number
): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> {
  const originalSize = file.size
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { naturalWidth: width, naturalHeight: height } = img

      if (maxWidth && width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas 2D unavailable'))

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      // Use target format: keep PNG if transparent, otherwise webp or jpeg
      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Compression failed'))
          resolve({
            blob,
            originalSize,
            compressedSize: blob.size,
          })
        },
        mime,
        quality
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

export async function convertImageFormat(
  file: File,
  targetFormat: 'image/png' | 'image/jpeg' | 'image/webp',
  quality: number = 0.92
): Promise<{ blob: Blob; name: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas 2D unavailable'))

      if (targetFormat === 'image/jpeg') {
        // Fill white background for JPEG since it has no transparency
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.drawImage(img, 0, 0)

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Conversion failed'))
          const extMap = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/webp': 'webp',
          }
          const base = file.name.replace(/\.[^/.]+$/, '')
          const newName = `${base}.${extMap[targetFormat]}`
          resolve({ blob, name: newName })
        },
        targetFormat,
        quality
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

export async function resizeImage(
  file: File,
  options: {
    width?: number
    height?: number
    scalePercent?: number
    maintainAspectRatio?: boolean
  }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let targetWidth = img.naturalWidth
      let targetHeight = img.naturalHeight

      if (options.scalePercent && options.scalePercent > 0) {
        const factor = options.scalePercent / 100
        targetWidth = Math.round(img.naturalWidth * factor)
        targetHeight = Math.round(img.naturalHeight * factor)
      } else if (options.width || options.height) {
        if (options.maintainAspectRatio) {
          if (options.width && !options.height) {
            targetWidth = options.width
            targetHeight = Math.round((img.naturalHeight * options.width) / img.naturalWidth)
          } else if (options.height && !options.width) {
            targetHeight = options.height
            targetWidth = Math.round((img.naturalWidth * options.height) / img.naturalHeight)
          } else if (options.width && options.height) {
            const ratio = Math.min(options.width / img.naturalWidth, options.height / img.naturalHeight)
            targetWidth = Math.round(img.naturalWidth * ratio)
            targetHeight = Math.round(img.naturalHeight * ratio)
          }
        } else {
          targetWidth = options.width || img.naturalWidth
          targetHeight = options.height || img.naturalHeight
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, targetWidth)
      canvas.height = Math.max(1, targetHeight)
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas 2D unavailable'))

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Resizing failed'))
        resolve(blob)
      }, file.type || 'image/png')
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

export async function watermarkImage(
  file: File,
  text: string,
  options: {
    opacity: number
    size: number
    colorHex: string
    position: 'center' | 'bottom-right' | 'bottom-left'
  }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas 2D unavailable'))

      ctx.drawImage(img, 0, 0)

      ctx.save()
      ctx.globalAlpha = Math.max(0.05, Math.min(1, options.opacity))
      ctx.fillStyle = options.colorHex
      ctx.font = `bold ${options.size}px sans-serif`

      const textMetrics = ctx.measureText(text)
      const textWidth = textMetrics.width
      const textHeight = options.size

      let x = canvas.width / 2 - textWidth / 2
      let y = canvas.height / 2 + textHeight / 3

      if (options.position === 'bottom-right') {
        x = canvas.width - textWidth - 30
        y = canvas.height - 30
      } else if (options.position === 'bottom-left') {
        x = 30
        y = canvas.height - 30
      }

      // Add soft shadow behind watermark for contrast
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
      ctx.shadowBlur = 6
      ctx.fillText(text, x, y)
      ctx.restore()

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Watermark export failed'))
        resolve(blob)
      }, file.type || 'image/png')
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

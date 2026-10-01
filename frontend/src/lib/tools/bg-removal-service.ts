import { removeBackground } from '@imgly/background-removal'

export type BgBackdropType = 'transparent' | 'color' | 'shadow'

export type RemoveBgOptions = {
  backdrop?: BgBackdropType
  colorHex?: string
  addShadow?: boolean
  onProgress?: (percent: number, statusText: string) => void
}

/**
 * Remove background from an image file using state-of-the-art AI.
 * Returns a high-resolution PNG blob with transparent background or chosen backdrop.
 */
export async function processBackgroundRemoval(
  file: File,
  options: RemoveBgOptions = {}
): Promise<Blob> {
  const { onProgress, backdrop = 'transparent', colorHex = '#FFFFFF', addShadow = false } = options

  onProgress?.(10, 'Initializing AI neural network...')

  let cutoutBlob: Blob
  try {
    cutoutBlob = await removeBackground(file, {
      progress: (key: string, current: number, total: number) => {
        if (total > 0) {
          const ratio = Math.min(1, current / total)
          const percent = Math.round(15 + ratio * 75)
          const stepName = key.includes('fetch')
            ? 'Downloading AI model weights...'
            : key.includes('compute')
            ? 'Analyzing subject & segmenting edges...'
            : 'Processing image...'
          onProgress?.(percent, stepName)
        }
      },
    })
  } catch (err: any) {
    console.warn('[AI BgRemoval] Model error, attempting canvas fallback:', err)
    onProgress?.(50, 'Using adaptive edge segmentation fallback...')
    cutoutBlob = await fallbackRemoveBackground(file)
  }

  onProgress?.(92, 'Compositing final image...')

  // If transparent and no shadow, return cutoutBlob directly
  if (backdrop === 'transparent' && !addShadow) {
    onProgress?.(100, 'Complete!')
    return cutoutBlob
  }

  // Composite with custom backdrop / shadow on a canvas
  const finalBlob = await compositeBackdrop(cutoutBlob, {
    backdrop,
    colorHex,
    addShadow,
  })

  onProgress?.(100, 'Complete!')
  return finalBlob
}

/**
 * Composites the transparent cutout on top of a solid color or adds a soft drop shadow.
 */
async function compositeBackdrop(
  cutoutBlob: Blob,
  options: {
    backdrop: BgBackdropType
    colorHex: string
    addShadow: boolean
  }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(cutoutBlob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas 2D unavailable'))

      if (options.backdrop === 'color' && options.colorHex) {
        ctx.fillStyle = options.colorHex
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      if (options.addShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
        ctx.shadowBlur = 18
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 10
      }

      ctx.drawImage(img, 0, 0)

      canvas.toBlob((b) => {
        if (!b) return reject(new Error('Canvas export failed'))
        resolve(b)
      }, 'image/png')
    }
    img.onerror = () => reject(new Error('Failed to load cutout image'))
    img.src = url
  })
}

/**
 * Fallback algorithm using high-frequency corner flood & edge color keying
 * for environments where WebAssembly/WebGL is constrained.
 */
async function fallbackRemoveBackground(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return reject(new Error('Canvas 2D unavailable'))

      ctx.drawImage(img, 0, 0)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imgData.data

      // Sample 4 corners to detect background color
      const sampleCorner = (x: number, y: number) => {
        const i = (y * canvas.width + x) * 4
        return [data[i], data[i + 1], data[i + 2]]
      }

      const corners = [
        sampleCorner(0, 0),
        sampleCorner(canvas.width - 1, 0),
        sampleCorner(0, canvas.height - 1),
        sampleCorner(canvas.width - 1, canvas.height - 1),
      ]

      const avgBg = [
        Math.round(corners.reduce((sum, c) => sum + c[0], 0) / 4),
        Math.round(corners.reduce((sum, c) => sum + c[1], 0) / 4),
        Math.round(corners.reduce((sum, c) => sum + c[2], 0) / 4),
      ]

      const threshold = 38
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        const dist = Math.sqrt(
          Math.pow(r - avgBg[0], 2) + Math.pow(g - avgBg[1], 2) + Math.pow(b - avgBg[2], 2)
        )

        if (dist < threshold) {
          data[i + 3] = 0 // Transparent
        } else if (dist < threshold + 18) {
          // Feathered edge
          data[i + 3] = Math.round(((dist - threshold) / 18) * 255)
        }
      }

      ctx.putImageData(imgData, 0, 0)
      canvas.toBlob((b) => {
        if (!b) return reject(new Error('Fallback export failed'))
        resolve(b)
      }, 'image/png')
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

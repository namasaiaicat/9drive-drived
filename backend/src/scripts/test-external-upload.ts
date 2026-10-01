import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '../config/prisma.js'
import { hashToken, randomToken } from '../utils/crypto.js'

const apiUrl = process.env.API_URL || 'http://localhost:4000'

// A minimal valid 1x1 PNG image (red pixel)
const samplePngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const samplePngBuffer = Buffer.from(samplePngBase64, 'base64')

async function run() {
  console.log('--- [1/6] Finding user & generating API Key for external platform ---')
  const user = await prisma.user.findFirst({ select: { id: true, email: true } })
  if (!user) throw new Error('No user found in database. Register or seed a user first.')

  const secret = `9d_live_${randomToken(32)}`
  const apiKey = await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: 'External Platform Client Test',
      keyPrefix: secret.slice(0, 16),
      keyHash: hashToken(secret),
      scopes: ['files:upload'],
    },
  })
  console.log(`Created API Key: ${apiKey.keyPrefix}... for user: ${user.email}`)

  console.log('\n--- [2/6] Simulating External Platform Upload with x-api-key ---')
  const form = new FormData()
  // Directly append file as an external website would
  form.append(
    'file',
    new Blob([samplePngBuffer], { type: 'image/png' }),
    'external-sample-image.png'
  )

  const uploadRes = await fetch(`${apiUrl}/api/v1/uploads`, {
    method: 'POST',
    headers: {
      'x-api-key': secret, // Using x-api-key header!
    },
    body: form,
  })

  const uploadText = await uploadRes.text()
  console.log(`Upload HTTP Status: ${uploadRes.status}`)
  console.log(`Upload Response JSON: ${uploadText}`)

  if (!uploadRes.ok) {
    throw new Error(`Upload failed with status ${uploadRes.status}: ${uploadText}`)
  }

  const uploadData = JSON.parse(uploadText)
  if (!uploadData.success || !uploadData.file?.url) {
    throw new Error('Upload response does not contain success: true or file.url')
  }

  const uploadedFile = uploadData.file
  console.log('\nUploaded file metadata:')
  console.log(`  - ID: ${uploadedFile.id}`)
  console.log(`  - Name: ${uploadedFile.name}`)
  console.log(`  - MimeType: ${uploadedFile.mimeType}`)
  console.log(`  - Size: ${uploadedFile.size} bytes`)
  console.log(`  - CDN View URL: ${uploadedFile.url}`)
  console.log(`  - CDN Raw URL: ${uploadedFile.downloadUrl}`)

  console.log('\n--- [3/6] Verifying GET /cdn/view/:id (Inline CDN Delivery) ---')
  const viewRes = await fetch(uploadedFile.url)
  console.log(`View HTTP Status: ${viewRes.status}`)
  console.log(`View Content-Type: ${viewRes.headers.get('content-type')}`)
  console.log(`View Cache-Control: ${viewRes.headers.get('cache-control')}`)
  console.log(`View CORS Allow-Origin: ${viewRes.headers.get('access-control-allow-origin')}`)
  console.log(`View Content-Disposition: ${viewRes.headers.get('content-disposition')}`)
  console.log(`View ETag: ${viewRes.headers.get('etag')}`)

  if (viewRes.status !== 200) {
    throw new Error(`Expected HTTP 200 from CDN view, got ${viewRes.status}`)
  }

  const cacheControl = viewRes.headers.get('cache-control') || ''
  if (!cacheControl.includes('public') || !cacheControl.includes('max-age=31536000') || !cacheControl.includes('immutable')) {
    throw new Error(`Cache-Control header missing required CDN directives: ${cacheControl}`)
  }

  const corsOrigin = viewRes.headers.get('access-control-allow-origin')
  if (corsOrigin !== '*') {
    throw new Error(`Expected Access-Control-Allow-Origin: *, got ${corsOrigin}`)
  }

  const viewBytes = Buffer.from(await viewRes.arrayBuffer())
  if (viewBytes.length !== samplePngBuffer.length) {
    throw new Error(`Downloaded image size mismatch: expected ${samplePngBuffer.length}, got ${viewBytes.length}`)
  }
  console.log(`[PASS] CDN image delivered inline with correct bytes & headers!`)

  console.log('\n--- [4/6] Verifying Conditional Request (304 Not Modified) ---')
  const etag = viewRes.headers.get('etag')
  if (etag) {
    const conditionalRes = await fetch(uploadedFile.url, {
      headers: { 'if-none-match': etag },
    })
    console.log(`Conditional Request HTTP Status: ${conditionalRes.status}`)
    if (conditionalRes.status !== 304) {
      throw new Error(`Expected 304 Not Modified for matching ETag, got ${conditionalRes.status}`)
    }
    console.log('[PASS] 304 Not Modified correctly returned for ETag cache hit!')
  }

  console.log('\n--- [5/6] Verifying GET /cdn/raw/:id (Attachment Download) ---')
  const rawRes = await fetch(uploadedFile.downloadUrl)
  console.log(`Raw HTTP Status: ${rawRes.status}`)
  console.log(`Raw Content-Disposition: ${rawRes.headers.get('content-disposition')}`)
  if (!rawRes.headers.get('content-disposition')?.includes('attachment;')) {
    throw new Error('Raw route did not return attachment Content-Disposition')
  }
  console.log('[PASS] Raw download route verified!')

  console.log('\n--- [6/6] Generating Demo HTML Page for Visual In-Browser Verification ---')
  const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>9Drive Object Storage & Media Gateway - Demo Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: #0b0f19; color: #f3f4f6; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
    .card { background: rgba(17, 24, 39, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 32px; max-width: 640px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.5); backdrop-filter: blur(12px); }
    .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; border: 1px solid rgba(16, 185, 129, 0.3); }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #ffffff; }
    p { color: #9ca3af; font-size: 14px; margin-bottom: 24px; line-height: 1.6; }
    .preview-box { background: #030712; border: 2px dashed rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; }
    .preview-box img { max-width: 100%; max-height: 240px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); image-rendering: pixelated; width: 120px; height: 120px; border: 2px solid #3b82f6; }
    .preview-label { font-size: 12px; color: #6b7280; margin-top: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    th { color: #9ca3af; font-weight: 500; width: 35%; }
    td { color: #e5e7eb; word-break: break-all; font-family: monospace; font-size: 12px; }
    .btn-group { display: flex; gap: 12px; }
    .btn { flex: 1; text-align: center; padding: 12px 18px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; transition: all 0.2s; cursor: pointer; }
    .btn-primary { background: #2563eb; color: #ffffff; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: rgba(255, 255, 255, 0.05); color: #d1d5db; border: 1px solid rgba(255, 255, 255, 0.1); }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">&#10003; Local CDN Gateway Live</div>
    <h1>9Drive Media Gateway</h1>
    <p>File ini diunggah via <code>POST /api/v1/uploads</code> menggunakan <code>x-api-key</code> dan langsung didistribusikan melalui route CDN baru:</p>
    
    <div class="preview-box">
      <!-- Direct CDN delivery route rendered via <img> tag -->
      <img src="${uploadedFile.url}" alt="Uploaded via 9Drive Object Storage" />
      <div class="preview-label">&lt;img src="${uploadedFile.url}" /&gt;</div>
    </div>

    <table>
      <tr><th>File ID</th><td>${uploadedFile.id}</td></tr>
      <tr><th>File Name</th><td>${uploadedFile.name}</td></tr>
      <tr><th>Mime Type</th><td>${uploadedFile.mimeType}</td></tr>
      <tr><th>File Size</th><td>${uploadedFile.size} bytes</td></tr>
      <tr><th>Storage Provider</th><td>${uploadedFile.provider}</td></tr>
      <tr><th>Cache-Control</th><td>public, max-age=31536000, immutable</td></tr>
      <tr><th>CORS Header</th><td>Access-Control-Allow-Origin: *</td></tr>
      <tr><th>CDN View URL</th><td><a href="${uploadedFile.url}" target="_blank" style="color: #60a5fa;">${uploadedFile.url}</a></td></tr>
      <tr><th>CDN Raw URL</th><td><a href="${uploadedFile.downloadUrl}" target="_blank" style="color: #60a5fa;">${uploadedFile.downloadUrl}</a></td></tr>
    </table>

    <div class="btn-group">
      <a href="${uploadedFile.url}" target="_blank" class="btn btn-primary">Buka CDN View</a>
      <a href="${uploadedFile.downloadUrl}" target="_blank" class="btn btn-secondary">Unduh File (Raw)</a>
    </div>
  </div>
</body>
</html>`

  const htmlPath = path.resolve(process.cwd(), '..', 'test-cdn-preview.html')
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8')
  console.log(`\nDemo HTML file written to: ${htmlPath}`)
  console.log('You can open this HTML file in your browser to inspect the rendered image!')

  console.log('\n======================================================')
  console.log('🎉 ALL END-TO-END VERIFICATION CHECKS PASSED!')
  console.log('======================================================')
}

run()
  .catch((err) => {
    console.error('\n❌ Test failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

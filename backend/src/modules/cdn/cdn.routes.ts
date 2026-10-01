import { Router } from 'express'
import type { Request, Response } from 'express'
import { prisma } from '../../config/prisma.js'
import { streamProviderFile } from '../files/stream-file.js'

export const cdnRouter = Router()

async function findCdnFile(id: string) {
  const file = await prisma.file.findFirst({
    where: {
      id,
      status: 'active',
      deletedAt: null,
    },
    include: {
      connectedAccount: true,
    },
  })

  if (!file || file.connectedAccount.status !== 'connected') {
    return null
  }

  return file
}

function setCdnHeaders(res: Response, file: { id: string; createdAt: Date; updatedAt: Date }) {
  const etag = `"${file.id}-${file.updatedAt ? file.updatedAt.getTime() : file.createdAt.getTime()}"`
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, ETag, Cache-Control')
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.setHeader('ETag', etag)
  res.setHeader('Last-Modified', (file.updatedAt || file.createdAt).toUTCString())
  return etag
}

// View/Preview route (inline disposition for <img> and web embedding)
cdnRouter.all('/view/:id', async (req: Request, res: Response, next) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', message: 'Only GET and HEAD methods are supported.' })
    }

    const file = await findCdnFile(String(req.params.id))
    if (!file) {
      return res.status(404).json({ code: 'FILE_NOT_FOUND', message: 'File not found or inactive.' })
    }

    const etag = setCdnHeaders(res, file)

    const ifNoneMatch = req.header('if-none-match')
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `W/${etag}` || ifNoneMatch === '*')) {
      return res.status(304).end()
    }

    if (req.method === 'HEAD') {
      res.setHeader('Content-Type', file.mimeType)
      res.setHeader('Content-Length', file.sizeBytes.toString())
      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Content-Disposition', `inline; filename="${file.name.replaceAll('"', '')}"`)
      return res.status(200).end()
    }

    return streamProviderFile(file, req.headers.range, res, {
      disposition: 'inline',
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return next(error)
  }
})

// Raw/Download route (attachment disposition for file download)
cdnRouter.all('/raw/:id', async (req: Request, res: Response, next) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', message: 'Only GET and HEAD methods are supported.' })
    }

    const file = await findCdnFile(String(req.params.id))
    if (!file) {
      return res.status(404).json({ code: 'FILE_NOT_FOUND', message: 'File not found or inactive.' })
    }

    const etag = setCdnHeaders(res, file)

    const ifNoneMatch = req.header('if-none-match')
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `W/${etag}` || ifNoneMatch === '*')) {
      return res.status(304).end()
    }

    if (req.method === 'HEAD') {
      res.setHeader('Content-Type', file.mimeType)
      res.setHeader('Content-Length', file.sizeBytes.toString())
      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Content-Disposition', `attachment; filename="${file.name.replaceAll('"', '')}"`)
      return res.status(200).end()
    }

    return streamProviderFile(file, req.headers.range, res, {
      disposition: 'attachment',
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return next(error)
  }
})

// Redirect /cdn/:id to /cdn/view/:id
cdnRouter.get('/:id', (req: Request, res: Response) => {
  res.redirect(301, `/cdn/view/${req.params.id}`)
})

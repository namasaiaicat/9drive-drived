import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware.js'
import {
  checkLocalAiStatus,
  getDirectoryContext,
  streamLocalAiChat,
} from './ai.service.js'

export const aiRouter = Router()

aiRouter.use(requireAuth)

/**
 * Check connectivity and discover installed models from Local AI runner.
 */
aiRouter.get('/status', async (req: AuthRequest, res, next) => {
  try {
    const endpointUrl = typeof req.query.endpoint === 'string' ? req.query.endpoint : undefined
    const status = await checkLocalAiStatus(endpointUrl)
    return res.json(status)
  } catch (error) {
    return next(error)
  }
})

/**
 * Fetch structured directory context and statistics for a folder.
 */
aiRouter.post('/folder-context', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      folderId: z.string().nullable().optional(),
      fetchLiveDrive: z.boolean().optional().default(false),
    })
    const body = schema.parse(req.body)
    const context = await getDirectoryContext(req.user!.id, body.folderId, body.fetchLiveDrive)
    return res.json(context)
  } catch (error) {
    return next(error)
  }
})

/**
 * Chat with Local AI about directory contents with streaming response.
 */
aiRouter.post('/chat', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      folderId: z.string().nullable().optional(),
      question: z.string().min(1).max(2000),
      fetchLiveDrive: z.boolean().optional().default(false),
      endpointUrl: z.string().optional(),
      modelName: z.string().optional(),
      conversationHistory: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string(),
          })
        )
        .optional()
        .default([]),
    })

    const body = schema.parse(req.body)

    // Gather folder context
    const directoryContext = await getDirectoryContext(
      req.user!.id,
      body.folderId,
      body.fetchLiveDrive
    )

    // Configure Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    // Send metadata preamble
    const preamble = JSON.stringify({
      type: 'meta',
      folderName: directoryContext.folder.name,
      stats: directoryContext.stats,
    })
    res.write(`data: ${preamble}\n\n`)

    await streamLocalAiChat({
      endpointUrl: body.endpointUrl,
      modelName: body.modelName,
      question: body.question,
      directoryManifest: directoryContext.textManifest,
      conversationHistory: body.conversationHistory,
      onToken: (token) => {
        const payload = JSON.stringify({ type: 'token', token })
        res.write(`data: ${payload}\n\n`)
      },
      onComplete: () => {
        res.write(`data: [DONE]\n\n`)
        res.end()
      },
      onError: (err) => {
        const errorPayload = JSON.stringify({
          type: 'error',
          message: err.message || 'Gagal memproses permintaan dengan Local AI.',
        })
        res.write(`data: ${errorPayload}\n\n`)
        res.write(`data: [DONE]\n\n`)
        res.end()
      },
    })
  } catch (error) {
    return next(error)
  }
})

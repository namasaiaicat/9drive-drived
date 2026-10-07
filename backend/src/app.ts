import fs from 'fs'
import path from 'path'
import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorMiddleware } from './middleware/error.middleware.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { providerConfigRouter } from './modules/provider-configs/provider-config.routes.js'
import { connectedAccountRouter } from './modules/connected-accounts/connected-account.routes.js'
import { storageRouter } from './modules/storage/storage.routes.js'
import { uploadRouter } from './modules/uploads/upload.routes.js'
import { fileRouter } from './modules/files/file.routes.js'
import { folderRouter } from './modules/folders/folder.routes.js'
import { publicRouter } from './modules/public/public.routes.js'
import { inviteRouter } from './modules/invites/invite.routes.js'
import { apiKeyRouter } from './modules/api-keys/api-key.routes.js'
import { publicApiRouter } from './modules/public-api/public-api.routes.js'
import { cdnRouter } from './modules/cdn/cdn.routes.js'
import { auditLogRouter } from './modules/audit-logs/audit-log.routes.js'
import { systemRouter } from './modules/system/system.routes.js'
import { aiRouter } from './modules/ai/ai.routes.js'

const baseDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd()

// Find frontend public build if available (for unified CLI or production hosting)
const possiblePublicDirs = [
  path.resolve(baseDir, '../public'),
  path.resolve(baseDir, '../../frontend/dist'),
  path.resolve(process.cwd(), 'dist-frontend'),
  path.resolve(process.cwd(), 'public'),
]
const publicDir = possiblePublicDirs.find((dir) => fs.existsSync(path.join(dir, 'index.html')))

export const app = express()
app.set('trust proxy', true)

// Dynamic CORS: Allow open access for CDN delivery and public API routes, allow frontend origins
app.use((req, res, next) => {
  if (req.path.startsWith('/cdn') || req.path.startsWith('/api') || req.path.startsWith('/public')) {
    return cors({ origin: '*' })(req, res, next)
  }
  const host = req.get('host')
  return cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin === env.FRONTEND_URL ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        (host && (origin === `http://${host}` || origin === `https://${host}`))
      ) {
        return callback(null, true)
      }
      return callback(null, false)
    },
    credentials: true,
  })(req, res, next)
})

app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/cdn', cdnRouter)
app.use('/api', publicApiRouter)
app.use('/public', publicRouter)

// Core module routers (both root and /api prefixes supported)
app.use('/auth', authRouter)
app.use('/api/auth', authRouter)

app.use('/api-keys', apiKeyRouter)
app.use('/api/api-keys', apiKeyRouter)

app.use('/provider-configs', providerConfigRouter)
app.use('/api/provider-configs', providerConfigRouter)

app.use('/connected-accounts', connectedAccountRouter)
app.use('/api/connected-accounts', connectedAccountRouter)

app.use('/storage', storageRouter)
app.use('/api/storage', storageRouter)

app.use('/uploads', uploadRouter)
app.use('/api/uploads', uploadRouter)

app.use('/files', fileRouter)
app.use('/api/files', fileRouter)

app.use('/folders', folderRouter)
app.use('/api/folders', folderRouter)

app.use('/invites', inviteRouter)
app.use('/api/invites', inviteRouter)

app.use('/audit-logs', auditLogRouter)
app.use('/api/audit-logs', auditLogRouter)

app.use('/system', systemRouter)
app.use('/api/system', systemRouter)

app.use('/ai', aiRouter)
app.use('/api/ai', aiRouter)

// Serve frontend SPA if bundle is found
if (publicDir) {
  app.use(express.static(publicDir))
  app.use((req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/cdn') ||
      req.path.startsWith('/public') ||
      req.path.startsWith('/auth') ||
      req.path.startsWith('/ai') ||
      req.path.startsWith('/api-keys') ||
      req.path.startsWith('/provider-configs') ||
      req.path.startsWith('/connected-accounts') ||
      req.path.startsWith('/storage') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/files') ||
      req.path.startsWith('/folders') ||
      req.path.startsWith('/invites') ||
      req.path.startsWith('/audit-logs') ||
      req.path.startsWith('/system') ||
      req.path.startsWith('/health')
    ) {
      return next()
    }
    if (req.method === 'GET') {
      return res.sendFile(path.join(publicDir, 'index.html'))
    }
    next()
  })
}

app.use(errorMiddleware)


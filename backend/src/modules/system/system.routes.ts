import { Router } from 'express'
import { exec, spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { prisma } from '../../config/prisma.js'
import { decryptText, encryptText } from '../../utils/crypto.js'
import Busboy from 'busboy'

export const systemRouter = Router()

function compareVersions(v1: string, v2: string): number {
  const p1 = v1.split('.').map(Number)
  const p2 = v2.split('.').map(Number)
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0
    const n2 = p2[i] || 0
    if (n1 > n2) return 1
    if (n1 < n2) return -1
  }
  return 0
}

systemRouter.get('/version', async (_req, res) => {
  let currentVersion = process.env.NINEDRIVE_VERSION || '1.0.9'
  try {
    const pkgPaths = [
      path.resolve(__dirname, '../../../../package.json'),
      path.resolve(__dirname, '../../../package.json'),
      path.resolve(__dirname, '../../package.json'),
      path.resolve(process.cwd(), 'package.json'),
      path.resolve(process.cwd(), '../package.json'),
    ]
    for (const p of pkgPaths) {
      if (fs.existsSync(p)) {
        const pkg = JSON.parse(fs.readFileSync(p, 'utf8'))
        if (pkg.version) {
          if (pkg.name === '9drive') {
            currentVersion = pkg.version
            break
          } else if (!process.env.NINEDRIVE_VERSION) {
            currentVersion = pkg.version
          }
        }
      }
    }
  } catch {}

  let latestVersion = currentVersion
  let hasUpdate = false

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const npmRes = await fetch('https://registry.npmjs.org/9drive/latest', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timeout)
    if (npmRes.ok) {
      const data = (await npmRes.json()) as any
      if (data?.version) {
        latestVersion = data.version
        hasUpdate = compareVersions(latestVersion, currentVersion) > 0
      }
    }
  } catch {}

  res.json({
    currentVersion,
    latestVersion,
    hasUpdate,
  })
})

systemRouter.post('/update', requireAuth, (req, res, next) => {
  const projectRoot = path.resolve(process.cwd(), '..')
  const updateScript = path.join(projectRoot, 'update.sh')

  // Check if git is installed
  exec('git --version', (gitError) => {
    if (gitError) {
      return res.status(400).json({
        code: 'GIT_NOT_FOUND',
        message: 'Git is not installed inside the app container. Since you are running 9Drive in Docker, please update by running:\n\n1. ssh root@103.65.237.136\n2. cd 9drive\n3. git pull\n4. docker-compose down && docker-compose up -d --build\n\ndirectly in your VPS host terminal.'
      })
    }

    if (fs.existsSync(updateScript)) {
      try {
        // Clear old update log to prevent race conditions on frontend polling
        const logFile = path.join(projectRoot, 'update.log')
        fs.writeFileSync(logFile, 'Initiating update...\n')

        const child = spawn('bash', ['update.sh'], {
          cwd: projectRoot,
          detached: true,
          stdio: 'ignore'
        })
        child.unref()

        return res.json({
          status: 'success',
          message: 'System update initiated. Rebuilding and restarting backend & frontend in the background. Please wait ~1 minute and refresh the page.'
        })
      } catch (err: any) {
        return res.status(500).json({
          code: 'UPDATE_FAILED',
          message: 'Failed to start update script.',
          error: err.message
        })
      }
    } else {
      // Fallback to simple git pull if update.sh doesn't exist
      exec('git pull', { cwd: projectRoot }, (error, stdout, stderr) => {
        if (error) {
          console.error('System update failed:', error)
          return res.status(500).json({
            code: 'UPDATE_FAILED',
            message: 'Failed to run git pull. Make sure git is installed and configured.',
            error: error.message,
            stderr
          })
        }

        console.log('System update stdout:', stdout)
        if (stderr) {
          console.warn('System update stderr:', stderr)
        }

        return res.json({
          status: 'success',
          message: 'System code updated successfully. Dev servers will auto-restart.',
          stdout,
          stderr
        })
      })
    }
  })
})

systemRouter.get('/update-log', requireAuth, (req, res) => {
  const projectRoot = path.resolve(process.cwd(), '..')
  const logFile = path.join(projectRoot, 'update.log')

  if (!fs.existsSync(logFile)) {
    return res.json({
      log: 'No update history found.'
    })
  }

  try {
    const logContent = fs.readFileSync(logFile, 'utf8')
    return res.json({
      log: logContent
    })
  } catch (error: any) {
    return res.status(500).json({
      code: 'READ_LOG_FAILED',
      message: 'Failed to read update log file.',
      error: error.message
    })
  }
})

systemRouter.get('/google-config', requireAuth, async (req, res, next) => {
  try {
    const config = await prisma.providerConfig.findFirst({
      where: { userId: null, provider: 'google_drive', status: 'active' },
      orderBy: { createdAt: 'desc' }
    })

    const defaultRedirect = `${req.protocol}://${req.get('host')}/connected-accounts/google/callback`

    if (!config) {
      return res.json({
        exists: false,
        defaultRedirectUri: defaultRedirect
      })
    }

    let clientId = ''
    try {
      clientId = decryptText(config.clientIdEncrypted)
    } catch {
      clientId = ''
    }

    return res.json({
      exists: true,
      clientId,
      redirectUri: config.redirectUri,
      hasSecret: !!config.clientSecretEncrypted,
      defaultRedirectUri: defaultRedirect
    })
  } catch (error) {
    return next(error)
  }
})

systemRouter.post('/google-config', requireAuth, async (req, res, next) => {
  try {
    const { clientId, clientSecret, redirectUri } = req.body

    if (!clientId) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Client ID is required.' })
    }

    const defaultRedirect = `${req.protocol}://${req.get('host')}/connected-accounts/google/callback`
    const finalRedirectUri = redirectUri || defaultRedirect

    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ]

    // Disable old global active config
    await prisma.providerConfig.updateMany({
      where: { userId: null, provider: 'google_drive', status: 'active' },
      data: { status: 'disabled' }
    })

    // Retrieve the old config to see if we need to reuse the secret if it was not provided in the request
    let finalSecret = clientSecret
    if (!finalSecret) {
      const oldConfig = await prisma.providerConfig.findFirst({
        where: { userId: null, provider: 'google_drive', status: 'disabled' },
        orderBy: { createdAt: 'desc' }
      })
      if (oldConfig) {
        try {
          finalSecret = decryptText(oldConfig.clientSecretEncrypted)
        } catch {
          // ignore
        }
      }
    }

    if (!finalSecret) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'Client Secret is required for first-time setup.' })
    }

    const config = await prisma.providerConfig.create({
      data: {
        userId: null,
        provider: 'google_drive',
        clientIdEncrypted: encryptText(clientId),
        clientSecretEncrypted: encryptText(finalSecret),
        redirectUri: finalRedirectUri,
        scopes,
        status: 'active'
      }
    })

    return res.status(201).json({
      status: 'success',
      message: 'Global Google OAuth configuration updated successfully.',
      id: config.id
    })
  } catch (error) {
    return next(error)
  }
})

systemRouter.get('/backup', requireAuth, async (req, res, next) => {
  try {
    const isSqlite = Boolean(process.env.DATABASE_URL?.startsWith('file:') || process.env.DATABASE_URL?.startsWith('sqlite:'))
    if (isSqlite) {
      const dbPath = getDatabaseFilePath()
      if (fs.existsSync(dbPath)) {
        res.setHeader('Content-Disposition', 'attachment; filename="9drive-backup.db"')
        res.setHeader('Content-Type', 'application/octet-stream')
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
        const fileStream = fs.createReadStream(dbPath)
        return fileStream.pipe(res)
      }
    }

    // Export all tables as structured snapshot
    const [
      users,
      apiKeys,
      uploadRoutingPolicies,
      userSessions,
      authHandoffs,
      providerConfigs,
      oauthStates,
      connectedAccounts,
      s3StorageConfigs,
      storageAccounts,
      folders,
      files,
      fileShares,
      filePreviewTokens,
      uploadSessions,
      auditLogs,
      workspaceInvites,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.apiKey.findMany(),
      prisma.uploadRoutingPolicy.findMany(),
      prisma.userSession.findMany(),
      prisma.authHandoff.findMany(),
      prisma.providerConfig.findMany(),
      prisma.oauthState.findMany(),
      prisma.connectedAccount.findMany(),
      prisma.s3StorageConfig.findMany(),
      prisma.storageAccount.findMany(),
      prisma.folder.findMany(),
      prisma.file.findMany(),
      prisma.fileShare.findMany(),
      prisma.filePreviewToken.findMany(),
      prisma.uploadSession.findMany(),
      prisma.auditLog.findMany(),
      prisma.workspaceInvite.findMany(),
    ])

    const dateStr = new Date().toISOString().split('T')[0]
    const backup = {
      version: '1.0',
      appName: '9Drive',
      exportedAt: new Date().toISOString(),
      provider: isSqlite ? 'sqlite' : 'mysql',
      data: {
        users,
        apiKeys,
        uploadRoutingPolicies,
        userSessions,
        authHandoffs,
        providerConfigs,
        oauthStates,
        connectedAccounts,
        s3StorageConfigs,
        storageAccounts,
        folders,
        files,
        fileShares,
        filePreviewTokens,
        uploadSessions,
        auditLogs,
        workspaceInvites,
      },
    }

    const jsonString = JSON.stringify(
      backup,
      (_key, value) => {
        if (typeof value === 'bigint') return value.toString()
        return value
      },
      2
    )

    res.setHeader('Content-Disposition', `attachment; filename="9drive-backup-${dateStr}.json"`)
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
    return res.send(jsonString)
  } catch (error) {
    return next(error)
  }
})

systemRouter.post('/restore', requireAuth, (req, res, next) => {
  try {
    const contentType = req.headers['content-type']
    if (!contentType?.includes('multipart/form-data')) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'multipart/form-data required.' })
    }

    const busboy = Busboy({ headers: req.headers, limits: { files: 1, fileSize: 100 * 1024 * 1024 } })
    let fileReceived = false

    busboy.on('file', (name, fileStream, info) => {
      fileReceived = true
      const filename = (info.filename || '').toLowerCase()
      const chunks: Buffer[] = []

      fileStream.on('data', (chunk) => {
        chunks.push(chunk)
      })

      fileStream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks)
          if (buffer.length === 0) {
            return res.status(400).json({ code: 'EMPTY_FILE', message: 'Uploaded backup file is empty.' })
          }

          const isSqlite = Boolean(process.env.DATABASE_URL?.startsWith('file:') || process.env.DATABASE_URL?.startsWith('sqlite:'))

          // Handle SQLite .db upload
          if (filename.endsWith('.db')) {
            if (!isSqlite) {
              return res.status(400).json({
                code: 'INVALID_FORMAT',
                message: 'You uploaded a SQLite .db file, but the active database is MySQL. Please upload a 9Drive JSON backup file (.json).'
              })
            }
            const dbPath = getDatabaseFilePath()
            const tempDbPath = dbPath + '.tmp'
            fs.writeFileSync(tempDbPath, buffer)
            await prisma.$disconnect()
            fs.renameSync(tempDbPath, dbPath)
            return res.json({
              status: 'success',
              message: 'Database restored successfully from .db file. Please reload the application.'
            })
          }

          // Handle JSON backup upload
          let parsed: any
          try {
            parsed = JSON.parse(buffer.toString('utf-8'))
          } catch {
            return res.status(400).json({
              code: 'PARSE_ERROR',
              message: 'Invalid backup file format. Expected a valid 9Drive JSON backup file.'
            })
          }

          const backupData = parsed.data || parsed
          if (!backupData || (!backupData.users && !backupData.connectedAccounts && !backupData.files && !backupData.folders)) {
            return res.status(400).json({
              code: 'INVALID_BACKUP_STRUCTURE',
              message: 'Uploaded file does not contain valid 9Drive backup data.'
            })
          }

          await restoreDatabaseFromJson(backupData, isSqlite)

          return res.json({
            status: 'success',
            message: 'Database restored successfully! All tables and data have been restored.'
          })
        } catch (err: any) {
          console.error('Failed to restore database:', err)
          return res.status(500).json({
            code: 'RESTORE_FAILED',
            message: 'Failed to restore database: ' + (err.message || 'Unknown error'),
            error: err.message
          })
        }
      })

      fileStream.on('error', (err) => {
        console.error('File stream error:', err)
        if (!res.headersSent) {
          return res.status(500).json({ code: 'UPLOAD_ERROR', message: err.message })
        }
      })
    })

    busboy.on('error', (err) => {
      console.error('Busboy error:', err)
      if (!res.headersSent) {
        next(err)
      }
    })

    busboy.on('finish', () => {
      if (!fileReceived && !res.headersSent) {
        return res.status(400).json({ code: 'BAD_REQUEST', message: 'No file uploaded.' })
      }
    })

    req.pipe(busboy)
  } catch (error) {
    return next(error)
  }
})

async function restoreDatabaseFromJson(backupData: any, isSqlite: boolean) {
  await prisma.$transaction(
    async (tx) => {
      if (!isSqlite) {
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;')
      }

      // Delete existing records in child-to-parent order
      await tx.workspaceInvite.deleteMany({})
      await tx.auditLog.deleteMany({})
      await tx.uploadSession.deleteMany({})
      await tx.filePreviewToken.deleteMany({})
      await tx.fileShare.deleteMany({})
      await tx.file.deleteMany({})
      await tx.folder.deleteMany({})
      await tx.storageAccount.deleteMany({})
      await tx.s3StorageConfig.deleteMany({})
      await tx.connectedAccount.deleteMany({})
      await tx.oauthState.deleteMany({})
      await tx.providerConfig.deleteMany({})
      await tx.authHandoff.deleteMany({})
      await tx.userSession.deleteMany({})
      await tx.uploadRoutingPolicy.deleteMany({})
      await tx.apiKey.deleteMany({})
      await tx.user.deleteMany({})

      // Insert restored records
      if (backupData.users?.length) {
        const records = backupData.users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          passwordHash: u.passwordHash,
          status: u.status,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
        }))
        await tx.user.createMany({ data: records })
      }

      if (backupData.apiKeys?.length) {
        const records = backupData.apiKeys.map((k: any) => ({
          id: k.id,
          userId: k.userId,
          name: k.name,
          keyPrefix: k.keyPrefix,
          keyHash: k.keyHash,
          scopes: k.scopes,
          status: k.status,
          lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt) : null,
          expiresAt: k.expiresAt ? new Date(k.expiresAt) : null,
          revokedAt: k.revokedAt ? new Date(k.revokedAt) : null,
          createdAt: k.createdAt ? new Date(k.createdAt) : new Date(),
          updatedAt: k.updatedAt ? new Date(k.updatedAt) : new Date(),
        }))
        await tx.apiKey.createMany({ data: records })
      }

      if (backupData.uploadRoutingPolicies?.length) {
        const records = backupData.uploadRoutingPolicies.map((p: any) => ({
          id: p.id,
          userId: p.userId,
          mode: p.mode,
          priorityAccountIds: p.priorityAccountIds,
          roundRobinCursor: p.roundRobinCursor ?? 0,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        }))
        await tx.uploadRoutingPolicy.createMany({ data: records })
      }

      if (backupData.userSessions?.length) {
        const records = backupData.userSessions.map((s: any) => ({
          id: s.id,
          userId: s.userId,
          refreshTokenHash: s.refreshTokenHash,
          userAgent: s.userAgent ?? null,
          ipAddress: s.ipAddress ?? null,
          expiresAt: s.expiresAt ? new Date(s.expiresAt) : new Date(),
          revokedAt: s.revokedAt ? new Date(s.revokedAt) : null,
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
        }))
        await tx.userSession.createMany({ data: records })
      }

      if (backupData.authHandoffs?.length) {
        const records = backupData.authHandoffs.map((h: any) => ({
          id: h.id,
          userId: h.userId,
          tokenHash: h.tokenHash,
          expiresAt: h.expiresAt ? new Date(h.expiresAt) : new Date(),
          usedAt: h.usedAt ? new Date(h.usedAt) : null,
          createdAt: h.createdAt ? new Date(h.createdAt) : new Date(),
        }))
        await tx.authHandoff.createMany({ data: records })
      }

      if (backupData.providerConfigs?.length) {
        const records = backupData.providerConfigs.map((c: any) => ({
          id: c.id,
          userId: c.userId ?? null,
          provider: c.provider,
          clientIdEncrypted: c.clientIdEncrypted,
          clientSecretEncrypted: c.clientSecretEncrypted,
          redirectUri: c.redirectUri,
          scopes: c.scopes,
          status: c.status,
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
        }))
        await tx.providerConfig.createMany({ data: records })
      }

      if (backupData.oauthStates?.length) {
        const records = backupData.oauthStates.map((o: any) => ({
          id: o.id,
          userId: o.userId ?? null,
          providerConfigId: o.providerConfigId,
          flow: o.flow,
          stateHash: o.stateHash,
          expiresAt: o.expiresAt ? new Date(o.expiresAt) : new Date(),
          usedAt: o.usedAt ? new Date(o.usedAt) : null,
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
        }))
        await tx.oauthState.createMany({ data: records })
      }

      if (backupData.connectedAccounts?.length) {
        const records = backupData.connectedAccounts.map((a: any) => ({
          id: a.id,
          userId: a.userId,
          providerConfigId: a.providerConfigId ?? null,
          provider: a.provider,
          providerAccountId: a.providerAccountId,
          email: a.email,
          displayName: a.displayName ?? null,
          avatarUrl: a.avatarUrl ?? null,
          accessTokenEncrypted: a.accessTokenEncrypted ?? null,
          refreshTokenEncrypted: a.refreshTokenEncrypted ?? null,
          tokenExpiresAt: a.tokenExpiresAt ? new Date(a.tokenExpiresAt) : null,
          scopes: a.scopes,
          status: a.status,
          lastError: a.lastError ?? null,
          createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
          updatedAt: a.updatedAt ? new Date(a.updatedAt) : new Date(),
        }))
        await tx.connectedAccount.createMany({ data: records })
      }

      if (backupData.s3StorageConfigs?.length) {
        const records = backupData.s3StorageConfigs.map((s: any) => ({
          id: s.id,
          userId: s.userId,
          connectedAccountId: s.connectedAccountId,
          name: s.name,
          bucket: s.bucket,
          region: s.region,
          endpoint: s.endpoint ?? null,
          accessKeyIdEncrypted: s.accessKeyIdEncrypted,
          secretAccessKeyEncrypted: s.secretAccessKeyEncrypted,
          forcePathStyle: Boolean(s.forcePathStyle),
          prefix: s.prefix ?? '9drive',
          quotaBytes: s.quotaBytes != null ? BigInt(s.quotaBytes) : null,
          status: s.status,
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
        }))
        await tx.s3StorageConfig.createMany({ data: records })
      }

      if (backupData.storageAccounts?.length) {
        const records = backupData.storageAccounts.map((s: any) => ({
          id: s.id,
          connectedAccountId: s.connectedAccountId,
          totalBytes: s.totalBytes != null ? BigInt(s.totalBytes) : null,
          usedBytes: s.usedBytes != null ? BigInt(s.usedBytes) : 0n,
          availableBytes: s.availableBytes != null ? BigInt(s.availableBytes) : null,
          trashBytes: s.trashBytes != null ? BigInt(s.trashBytes) : null,
          lastSyncedAt: s.lastSyncedAt ? new Date(s.lastSyncedAt) : null,
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
        }))
        await tx.storageAccount.createMany({ data: records })
      }

      if (backupData.folders?.length) {
        const records = backupData.folders.map((f: any) => ({
          id: f.id,
          userId: f.userId,
          parentId: f.parentId ?? null,
          connectedAccountId: f.connectedAccountId ?? null,
          provider: f.provider ?? 'google_drive',
          providerFolderId: f.providerFolderId ?? null,
          name: f.name,
          color: f.color ?? 'text-blue-500',
          iconUrl: f.iconUrl ?? null,
          createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
          updatedAt: f.updatedAt ? new Date(f.updatedAt) : new Date(),
          deletedAt: f.deletedAt ? new Date(f.deletedAt) : null,
        }))
        await tx.folder.createMany({ data: records })
      }

      if (backupData.files?.length) {
        const records = backupData.files.map((f: any) => ({
          id: f.id,
          userId: f.userId,
          connectedAccountId: f.connectedAccountId,
          folderId: f.folderId ?? null,
          provider: f.provider,
          providerFileId: f.providerFileId,
          name: f.name,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes != null ? BigInt(f.sizeBytes) : 0n,
          checksum: f.checksum ?? null,
          status: f.status ?? 'active',
          createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
          updatedAt: f.updatedAt ? new Date(f.updatedAt) : new Date(),
          deletedAt: f.deletedAt ? new Date(f.deletedAt) : null,
        }))
        await tx.file.createMany({ data: records })
      }

      if (backupData.fileShares?.length) {
        const records = backupData.fileShares.map((s: any) => ({
          id: s.id,
          fileId: s.fileId,
          userId: s.userId,
          token: s.token ?? null,
          tokenHash: s.tokenHash,
          enabled: s.enabled ?? true,
          expiresAt: s.expiresAt ? new Date(s.expiresAt) : null,
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
        }))
        await tx.fileShare.createMany({ data: records })
      }

      if (backupData.filePreviewTokens?.length) {
        const records = backupData.filePreviewTokens.map((t: any) => ({
          id: t.id,
          fileId: t.fileId,
          userId: t.userId,
          tokenHash: t.tokenHash,
          expiresAt: t.expiresAt ? new Date(t.expiresAt) : new Date(),
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
        }))
        await tx.filePreviewToken.createMany({ data: records })
      }

      if (backupData.uploadSessions?.length) {
        const records = backupData.uploadSessions.map((u: any) => ({
          id: u.id,
          userId: u.userId,
          targetConnectedAccountId: u.targetConnectedAccountId ?? null,
          folderId: u.folderId ?? null,
          fileName: u.fileName,
          mimeType: u.mimeType,
          sizeBytes: u.sizeBytes != null ? BigInt(u.sizeBytes) : 0n,
          status: u.status,
          googleSessionUri: u.googleSessionUri ?? null,
          errorMessage: u.errorMessage ?? null,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          completedAt: u.completedAt ? new Date(u.completedAt) : null,
        }))
        await tx.uploadSession.createMany({ data: records })
      }

      if (backupData.auditLogs?.length) {
        const records = backupData.auditLogs.map((l: any) => ({
          id: l.id,
          userId: l.userId ?? null,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId ?? null,
          metadata: l.metadata ?? null,
          createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
        }))
        await tx.auditLog.createMany({ data: records })
      }

      if (backupData.workspaceInvites?.length) {
        const records = backupData.workspaceInvites.map((i: any) => ({
          id: i.id,
          inviterId: i.inviterId,
          inviteeEmail: i.inviteeEmail,
          targetType: i.targetType ?? 'file',
          targetId: i.targetId ?? '',
          role: i.role ?? 'viewer',
          status: i.status ?? 'pending',
          revokedAt: i.revokedAt ? new Date(i.revokedAt) : null,
          acceptedAt: i.acceptedAt ? new Date(i.acceptedAt) : null,
          createdAt: i.createdAt ? new Date(i.createdAt) : new Date(),
          updatedAt: i.updatedAt ? new Date(i.updatedAt) : new Date(),
        }))
        await tx.workspaceInvite.createMany({ data: records })
      }

      if (!isSqlite) {
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;')
      }
    },
    {
      timeout: 60000,
      maxWait: 10000,
    }
  )
}

function getDatabaseFilePath(): string {
  const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'
  let cleanPath = dbUrl.replace(/^(sqlite|file):/, '')

  if (cleanPath.includes('?')) {
    cleanPath = cleanPath.split('?')[0]
  }

  if (!path.isAbsolute(cleanPath)) {
    let baseDir = path.resolve(process.cwd(), 'prisma')
    if (!fs.existsSync(baseDir)) {
      baseDir = path.resolve(process.cwd(), 'backend', 'prisma')
    }
    if (!fs.existsSync(baseDir)) {
      baseDir = path.resolve(process.cwd(), '..', 'backend', 'prisma')
    }
    return path.resolve(baseDir, cleanPath)
  }

  return cleanPath
}


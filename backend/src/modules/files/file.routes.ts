import { Router } from 'express'
import { google } from 'googleapis'
import { z } from 'zod'
import { prisma } from '../../config/prisma.js'
import { env } from '../../config/env.js'
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware.js'
import { hashToken, randomToken } from '../../utils/crypto.js'
import { getAuthedGoogleClient, syncGoogleAppFolderFiles, syncGoogleQuota, getGoogleStarredFiles, getGoogleRecentFiles, getGoogleSharedFiles, setGoogleFileStarred, findInheritedPermissionOrigin } from '../google/google.service.js'
import { deleteS3Object, syncS3Quota, createS3Client, getS3ConfigForAccount } from '../s3/s3.service.js'
import { streamProviderFile } from './stream-file.js'
import { googleDownloadExportMimeTypes, normalizeHeaders, withExtension } from './stream-google-file.js'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import { ZipArchive } from 'archiver'
import { createAuditLog } from '../../utils/audit.js'
import { mimeFilter } from './file-types.js'



export const fileRouter = Router()

fileRouter.get('/preview/:token', async (req, res, next) => {
  try {
    const token = String(req.params.token)
    const preview = await prisma.filePreviewToken.findFirst({
      where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
      include: { file: { include: { connectedAccount: true } } },
    })
    if (!preview || preview.file.status !== 'active') return res.status(404).json({ code: 'PREVIEW_NOT_FOUND', message: 'Preview token not found.' })
    return streamProviderFile(preview.file, req.headers.range, res, { disposition: 'inline' })
  } catch (error) {
    return next(error)
  }
})

fileRouter.use(requireAuth)

fileRouter.get('/suggestions', async (req: AuthRequest, res, next) => {
  try {
    const query = z.object({
      q: z.string().trim().max(255).optional(),
      kind: z.enum(['image', 'video', 'pdf', 'doc', 'archive']).optional(),
      accountId: z.string().optional(),
      limit: z.coerce.number().min(1).max(20).default(8),
      modified: z.enum(['today', '7d', '30d', 'year']).optional(),
    }).parse(req.query)

    const q = query.q || ''
    if (!q && !query.kind && !query.modified) {
      return res.json({ files: [], folders: [] })
    }

    let modifiedDateFilter: Date | undefined
    if (query.modified) {
      const now = new Date()
      if (query.modified === 'today') {
        modifiedDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (query.modified === '7d') {
        modifiedDateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (query.modified === '30d') {
        modifiedDateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      } else if (query.modified === 'year') {
        modifiedDateFilter = new Date(now.getFullYear(), 0, 1)
      }
    }

    const fileWhere: any = {
      userId: req.user!.id,
      status: 'active',
      ...(q ? { name: { contains: q } } : {}),
      ...(query.accountId && query.accountId !== 'all' ? { connectedAccountId: query.accountId } : {}),
      ...(query.kind ? { mimeType: mimeFilter(query.kind) } : {}),
      ...(modifiedDateFilter ? { updatedAt: { gte: modifiedDateFilter } } : {})
    }

    const folderWhere: any = {
      userId: req.user!.id,
      deletedAt: null,
      ...(q ? { name: { contains: q } } : {}),
      ...(query.accountId && query.accountId !== 'all' ? { connectedAccountId: query.accountId } : {}),
      ...(modifiedDateFilter ? { updatedAt: { gte: modifiedDateFilter } } : {})
    }

    const [files, folders] = await Promise.all([
      prisma.file.findMany({
        where: fileWhere,
        take: query.limit,
        select: {
          id: true,
          name: true,
          mimeType: true,
          sizeBytes: true,
          folderId: true,
          provider: true,
          providerFileId: true,
          updatedAt: true,
          createdAt: true,
          connectedAccount: {
            select: { id: true, email: true, provider: true, displayName: true }
          },
          folder: {
            select: { id: true, name: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      !query.kind ? prisma.folder.findMany({
        where: folderWhere,
        take: 3,
        select: {
          id: true,
          name: true,
          color: true,
          iconUrl: true,
          updatedAt: true,
          createdAt: true,
          connectedAccount: {
            select: { id: true, email: true, provider: true, displayName: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }) : Promise.resolve([])
    ])

    return res.json({
      files: files.map((file) => ({
        ...file,
        sizeBytes: file.sizeBytes.toString(),
        driveUrl: file.provider === 'google_drive' && file.providerFileId
          ? `https://drive.google.com/file/d/${file.providerFileId}/view?usp=sharing`
          : null,
      })),
      folders
    })
  } catch (error) {
    return next(error)
  }
})

fileRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const query = z.object({
      folderId: z.string().optional(),
      q: z.string().trim().max(255).optional(),
      kind: z.enum(['image', 'video', 'pdf', 'doc', 'archive']).optional(),
      accountId: z.string().optional(),
      minSize: z.coerce.number().optional(),
      maxSize: z.coerce.number().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      modified: z.enum(['today', '7d', '30d', 'year']).optional(),
      limit: z.coerce.number().int().min(1).max(500).default(250),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      sort: z.enum(['date_desc', 'date_asc', 'name_asc', 'name_desc', 'size_asc', 'size_desc']).default('date_desc'),
    }).parse(req.query)

    let modifiedDateFilter: Date | undefined
    if (query.modified) {
      const now = new Date()
      if (query.modified === 'today') {
        modifiedDateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (query.modified === '7d') {
        modifiedDateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (query.modified === '30d') {
        modifiedDateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      } else if (query.modified === 'year') {
        modifiedDateFilter = new Date(now.getFullYear(), 0, 1)
      }
    }

    const where: any = {
      userId: req.user!.id,
      status: 'active',
      ...(query.folderId ? { folderId: query.folderId } : {}),
      ...(query.q ? { name: { contains: query.q } } : {}),
      ...(query.accountId && query.accountId !== 'all' ? { connectedAccountId: query.accountId } : {}),
      ...(query.kind ? { mimeType: mimeFilter(query.kind) } : {}),
      ...(modifiedDateFilter ? { updatedAt: { gte: modifiedDateFilter } } : {}),
      ...(query.minSize !== undefined || query.maxSize !== undefined ? {
        sizeBytes: {
          ...(query.minSize !== undefined ? { gte: BigInt(query.minSize) } : {}),
          ...(query.maxSize !== undefined ? { lte: BigInt(query.maxSize) } : {})
        }
      } : {}),
      ...(query.startDate || query.endDate ? {
        updatedAt: {
          ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
          ...(query.endDate ? { lte: new Date(query.endDate) } : {})
        }
      } : {})
    }

    const direction = query.sort.endsWith('_asc') ? 'asc' as const : 'desc' as const
    const field = query.sort.startsWith('name_') ? 'name' : query.sort.startsWith('size_') ? 'sizeBytes' : 'updatedAt'
    const total = await prisma.file.count({ where })
    const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.limit)))
    const files = await prisma.file.findMany({
      where,
      take: query.limit,
      skip: (page - 1) * query.limit,
      include: {
        connectedAccount: { select: { id: true, email: true, provider: true } },
        folder: { select: { id: true, name: true } }
      },
      orderBy: [{ [field]: direction }, { id: direction }]
    })
    return res.json({
      total, page, pageSize: query.limit, hasMore: page * query.limit < total,
      files: files.map((file) => ({
        ...file,
        sizeBytes: file.sizeBytes.toString(),
        driveUrl: file.provider === 'google_drive' && file.providerFileId
          ? `https://drive.google.com/file/d/${file.providerFileId}/view?usp=sharing`
          : null,
      })),
    })
  } catch (error) {
    return next(error)
  }
})

const batchFileSchema = z.object({ fileIds: z.array(z.string().min(1)).min(1).max(100) })

fileRouter.patch('/batch', async (req: AuthRequest, res, next) => {
  try {
    const body = batchFileSchema.extend({ folderId: z.string().nullable().optional() }).parse(req.body)
    if (body.folderId) await prisma.folder.findFirstOrThrow({ where: { id: body.folderId, userId: req.user!.id, deletedAt: null } })
    const result = await prisma.file.updateMany({ where: { id: { in: body.fileIds }, userId: req.user!.id, status: 'active' }, data: { folderId: body.folderId ?? null } })
    await createAuditLog(req.user!.id, 'MOVE_FILES', 'file', undefined, { count: result.count, folderId: body.folderId })
    return res.json({ status: 'ok', moved: result.count })
  } catch (error) {
    return next(error)
  }
})

fileRouter.delete('/batch', async (req: AuthRequest, res, next) => {
  try {
    const body = batchFileSchema.parse(req.body)
    const files = await prisma.file.findMany({ where: { id: { in: body.fileIds }, userId: req.user!.id, status: 'active' } })
    const result = await prisma.file.updateMany({
      where: { id: { in: body.fileIds }, userId: req.user!.id, status: 'active' },
      data: { status: 'deleted', deletedAt: new Date() }
    })
    for (const f of files) {
      await createAuditLog(req.user!.id, 'TRASH_FILE', 'file', f.id, { name: f.name })
    }
    return res.json({ status: 'ok', deleted: result.count })
  } catch (error) {
    return next(error)
  }
})

fileRouter.get('/trash', async (req: AuthRequest, res, next) => {
  try {
    const query = z.object({
      q: z.string().trim().max(255).optional(),
      accountId: z.string().optional()
    }).parse(req.query)
    const files = await prisma.file.findMany({
      where: {
        userId: req.user!.id,
        status: 'deleted',
        ...(query.q ? { name: { contains: query.q } } : {}),
        ...(query.accountId ? { connectedAccountId: query.accountId } : {})
      },
      include: {
        connectedAccount: { select: { id: true, email: true, provider: true } },
        folder: { select: { id: true, name: true } }
      },
      orderBy: { deletedAt: 'desc' }
    })
    return res.json({ files: files.map((file) => ({ ...file, sizeBytes: file.sizeBytes.toString() })) })
  } catch (error) {
    return next(error)
  }
})

fileRouter.get('/starred', async (req: AuthRequest, res, next) => {
  try {
    const accountId = req.query.accountId as string | undefined
    const googleAccounts = await prisma.connectedAccount.findMany({
      where: {
        userId: req.user!.id,
        provider: 'google_drive',
        status: 'connected',
        ...(accountId ? { id: accountId } : {})
      },
    })
    const files: any[] = []
    for (const account of googleAccounts) {
      try {
        const accountStarred = await getGoogleStarredFiles(account.id, req.user!.id)
        files.push(...accountStarred)
      } catch (err: any) {
        console.error('Failed to get starred files for account', account.id, err.message)
      }
    }
    return res.json({ files })
  } catch (error) {
    return next(error)
  }
})

fileRouter.get('/recent', async (req: AuthRequest, res, next) => {
  try {
    const accountId = req.query.accountId as string | undefined
    const googleAccounts = await prisma.connectedAccount.findMany({
      where: {
        userId: req.user!.id,
        provider: 'google_drive',
        status: 'connected',
        ...(accountId ? { id: accountId } : {})
      },
    })
    const files: any[] = []
    for (const account of googleAccounts) {
      try {
        const accountRecent = await getGoogleRecentFiles(account.id, req.user!.id)
        files.push(...accountRecent)
      } catch (err: any) {
        console.error('Failed to get recent files for account', account.id, err.message)
      }
    }
    if (files.length === 0) {
      const dbFiles = await prisma.file.findMany({
        where: {
          userId: req.user!.id,
          status: 'active',
          ...(accountId ? { connectedAccountId: accountId } : {})
        },
        include: {
          connectedAccount: { select: { id: true, email: true, provider: true } },
          folder: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      })
      files.push(
        ...dbFiles.map((file) => ({
          ...file,
          sizeBytes: file.sizeBytes.toString(),
          viewedAt: file.updatedAt.toISOString(),
        }))
      )
    }
    return res.json({ files })
  } catch (error) {
    return next(error)
  }
})

fileRouter.get('/shared', async (req: AuthRequest, res, next) => {
  try {
    const accountId = req.query.accountId as string | undefined
    const googleAccounts = await prisma.connectedAccount.findMany({
      where: {
        userId: req.user!.id,
        provider: 'google_drive',
        status: 'connected',
        ...(accountId ? { id: accountId } : {})
      },
    })
    const files: any[] = []
    const folders: any[] = []
    for (const account of googleAccounts) {
      try {
        const result = await getGoogleSharedFiles(account.id, req.user!.id)
        files.push(...result.files)
        folders.push(...result.folders)
      } catch (err: any) {
        console.error('Failed to get shared files for account', account.id, err.message)
      }
    }
    return res.json({ files, folders })
  } catch (error) {
    return next(error)
  }
})

fileRouter.post('/:id/star', async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({ starred: z.boolean() }).parse(req.body)
    const fileId = String(req.params.id)
    const file = await prisma.file.findFirst({
      where: { id: fileId, userId: req.user!.id },
      include: { connectedAccount: true },
    })
    if (!file) return res.status(404).json({ message: 'File not found' })

    if (file.provider === 'google_drive' && file.connectedAccount) {
      await setGoogleFileStarred(file.connectedAccountId, req.user!.id, file.providerFileId, body.starred)
    }
    await createAuditLog(req.user!.id, body.starred ? 'STAR_FILE' : 'UNSTAR_FILE', 'file', file.id, { name: file.name })
    return res.json({ status: 'ok', starred: body.starred })
  } catch (error) {
    return next(error)
  }
})


fileRouter.post('/batch/restore', async (req: AuthRequest, res, next) => {
  try {
    const body = batchFileSchema.parse(req.body)
    const files = await prisma.file.findMany({ where: { id: { in: body.fileIds }, userId: req.user!.id, status: 'deleted' } })
    const result = await prisma.file.updateMany({
      where: { id: { in: body.fileIds }, userId: req.user!.id, status: 'deleted' },
      data: { status: 'active', deletedAt: null }
    })
    for (const f of files) {
      await createAuditLog(req.user!.id, 'RESTORE_FILE', 'file', f.id, { name: f.name })
    }
    return res.json({ status: 'ok', restored: result.count })
  } catch (error) {
    return next(error)
  }
})

fileRouter.delete('/batch/permanent', async (req: AuthRequest, res, next) => {
  try {
    const body = batchFileSchema.parse(req.body)
    const files = await prisma.file.findMany({
      where: { id: { in: body.fileIds }, userId: req.user!.id, status: 'deleted' },
      include: { connectedAccount: true }
    })
    const deletedIds: string[] = []
    const syncedAccountIds = new Set<string>()
    const failed: Array<{ fileId: string; message: string }> = []

    for (const file of files) {
      try {
        if (file.provider === 's3') {
          await deleteS3Object(file)
        } else {
          const auth = await getAuthedGoogleClient(file.connectedAccount)
          const drive = google.drive({ version: 'v3', auth })
          await drive.files.delete({ fileId: file.providerFileId })
        }
        deletedIds.push(file.id)
        syncedAccountIds.add(file.connectedAccountId)
        await createAuditLog(req.user!.id, 'PERMANENT_DELETE_FILE', 'file', file.id, { name: file.name })
      } catch (error) {
        failed.push({ fileId: file.id, message: error instanceof Error ? error.message : 'Delete failed' })
      }
    }

    if (deletedIds.length > 0) {
      await prisma.file.deleteMany({
        where: { id: { in: deletedIds }, userId: req.user!.id }
      })
    }

    for (const accountId of syncedAccountIds) {
      const account = files.find((file) => file.connectedAccountId === accountId)?.connectedAccount
      if (account?.provider === 's3') {
        await syncS3Quota(accountId).catch(() => undefined)
      } else {
        await syncGoogleQuota(accountId).catch(() => undefined)
      }
    }

    if (deletedIds.length === 0 && failed.length > 0) {
      return res.status(400).json({ code: 'FILES_DELETE_FAILED', message: 'No files were permanently deleted.', deleted: 0, failed })
    }
    return res.json({ status: 'ok', deleted: deletedIds.length, failed })
  } catch (error) {
    return next(error)
  }
})

fileRouter.get('/shared-links', async (req: AuthRequest, res, next) => {
  try {
    const shares = await prisma.fileShare.findMany({
      where: { userId: req.user!.id, enabled: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: { file: { include: { connectedAccount: { select: { email: true, provider: true } }, folder: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
    return res.json({
      shares: shares.filter((share) => share.file.status === 'active').map((share) => {
        const url = share.token ? `${env.FRONTEND_URL}/public/files/${share.token}` : null
        return {
          id: share.id,
          url,
          createdAt: share.createdAt.toISOString(),
          expiresAt: share.expiresAt?.toISOString() ?? null,
          file: { ...share.file, sizeBytes: share.file.sizeBytes.toString() },
        }
      })
    })
  } catch (error) {
    return next(error)
  }
})

fileRouter.post('/sync-google', async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({ connectedAccountId: z.string().min(1).optional() }).parse(req.body ?? {})
    const accounts = await prisma.connectedAccount.findMany({
      where: { userId: req.user!.id, provider: 'google_drive', status: 'connected', ...(body.connectedAccountId ? { id: body.connectedAccountId } : {}) },
      select: { id: true },
    })

    const results = []
    for (const account of accounts) results.push(await syncGoogleAppFolderFiles(account.id, req.user!.id))

    return res.json({
      status: 'ok',
      results,
    })
  } catch (error) {
    return next(error)
  }
})

fileRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const fileId = String(req.params.id)
    const file = await prisma.file.findFirstOrThrow({ where: { id: fileId, userId: req.user!.id }, include: { connectedAccount: { select: { id: true, email: true, provider: true } }, folder: { select: { id: true, name: true } } } })
    return res.json({ file: { ...file, sizeBytes: file.sizeBytes.toString() } })
  } catch (error) {
    return next(error)
  }
})

fileRouter.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({ name: z.string().min(1).max(255).optional(), folderId: z.string().nullable().optional() }).parse(req.body)
    const fileId = String(req.params.id)
    const file = await prisma.file.findFirstOrThrow({ where: { id: fileId, userId: req.user!.id }, include: { connectedAccount: true } })
    const drive = file.provider === 's3' ? null : google.drive({ version: 'v3', auth: await getAuthedGoogleClient(file.connectedAccount) })
    if (body.folderId) await prisma.folder.findFirstOrThrow({ where: { id: body.folderId, userId: req.user!.id, deletedAt: null } })
    if (body.name && drive) await drive.files.update({ fileId: file.providerFileId, requestBody: { name: body.name } })
    const updated = await prisma.file.update({ where: { id: file.id }, data: { ...(body.name ? { name: body.name } : {}), ...(body.folderId !== undefined ? { folderId: body.folderId } : {}) }, include: { connectedAccount: { select: { id: true, email: true, provider: true } }, folder: { select: { id: true, name: true } } } })
    await createAuditLog(req.user!.id, 'UPDATE_FILE', 'file', updated.id, { name: updated.name, updates: body })
    return res.json({ file: { ...updated, sizeBytes: updated.sizeBytes.toString() } })
  } catch (error) {
    return next(error)
  }
})

fileRouter.post('/:id/share', async (req: AuthRequest, res, next) => {
  try {
    const fileId = String(req.params.id)
    const file = await prisma.file.findFirst({
      where: {
        OR: [
          { id: fileId, userId: req.user!.id },
          { providerFileId: fileId, userId: req.user!.id },
          { id: fileId },
          { providerFileId: fileId },
        ],
        status: 'active',
      },
      include: { connectedAccount: true },
    })

    if (!file) {
      const folder = await prisma.folder.findFirst({
        where: {
          OR: [
            { id: fileId, userId: req.user!.id },
            { providerFolderId: fileId, userId: req.user!.id },
            { id: fileId },
            { providerFolderId: fileId },
          ],
          deletedAt: null,
        },
      })
      if (folder) {
        const folderUrl = folder.providerFolderId ? `https://drive.google.com/drive/folders/${folder.providerFolderId}` : `${env.FRONTEND_URL}/all-files?folderId=${folder.id}`
        return res.status(200).json({ url: folderUrl, isGoogleDrive: Boolean(folder.providerFolderId) })
      }
      return res.status(404).json({ code: 'NOT_FOUND', message: 'File or folder not found.' })
    }

    if (file.provider === 'google_drive' && file.providerFileId) {
      try {
        if (file.connectedAccount) {
          const auth = await getAuthedGoogleClient(file.connectedAccount)
          const drive = google.drive({ version: 'v3', auth })
          await drive.permissions.create({
            fileId: file.providerFileId,
            requestBody: { role: 'reader', type: 'anyone' },
            supportsAllDrives: true,
          })
        }
      } catch (err: any) {
        console.error('Google permission grant error:', err.message || err)
      }
      const gdriveUrl = `https://drive.google.com/file/d/${file.providerFileId}/view?usp=sharing`
      return res.status(200).json({ url: gdriveUrl, isGoogleDrive: true })
    }

    const existingShare = await prisma.fileShare.findFirst({
      where: { fileId: file.id, userId: req.user!.id, enabled: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { createdAt: 'desc' },
    })

    let shareId = existingShare?.id
    let token = existingShare?.token
    if (!existingShare) {
      token = randomToken(32)
      const share = await prisma.fileShare.create({ data: { fileId: file.id, userId: req.user!.id, token, tokenHash: hashToken(token) } })
      shareId = share.id
    }

    return res.status(existingShare ? 200 : 201).json({ url: `${env.FRONTEND_URL}/public/files/${token}`, shareId })
  } catch (error) {
    return next(error)
  }
})

fileRouter.get('/:id/permissions', async (req: AuthRequest, res, next) => {
  try {
    const fileId = String(req.params.id)
    const file = await prisma.file.findFirst({
      where: {
        OR: [
          { id: fileId, userId: req.user!.id },
          { providerFileId: fileId, userId: req.user!.id },
          { id: fileId },
          { providerFileId: fileId },
        ],
        status: 'active',
      },
      include: { connectedAccount: true },
    })

    if (!file) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found.' })
    }

    if (file.provider === 'google_drive' && file.providerFileId) {
      let generalAccess: 'restricted' | 'anyone' = 'restricted'
      let role = 'reader'
      let isInherited = false
      let inheritedFrom: string | null = null
      let parentName: string | null = null

      if (file.connectedAccount) {
        try {
          const auth = await getAuthedGoogleClient(file.connectedAccount)
          const drive = google.drive({ version: 'v3', auth })
          const permList = await drive.permissions.list({
            fileId: file.providerFileId,
            fields: 'permissions(id, role, type, permissionDetails)',
            supportsAllDrives: true,
          })
          const anyonePerm = permList.data.permissions?.find((p) => p.type === 'anyone')
          if (anyonePerm) {
            generalAccess = 'anyone'
            role = anyonePerm.role ?? 'reader'
            const inheritedDetail = (anyonePerm as any)?.permissionDetails?.find((d: any) => d.inherited)
            isInherited = Boolean((anyonePerm as any)?.inherited || inheritedDetail)
            if (isInherited) {
              const origin = await findInheritedPermissionOrigin(drive, file.providerFileId)
              if (origin) {
                inheritedFrom = origin.id
                parentName = origin.name
              }
            }
          }
        } catch (err: any) {
          console.error('Failed to query Google Drive permissions:', err.message || err)
        }
      }

      const driveUrl = `https://drive.google.com/file/d/${file.providerFileId}/view?usp=sharing`
      return res.json({
        fileId: file.id,
        fileName: file.name,
        provider: file.provider,
        generalAccess,
        role,
        isInherited,
        inheritedFrom,
        parentName,
        shareUrl: driveUrl,
        driveUrl,
      })
    }

    const share = await prisma.fileShare.findFirst({
      where: { fileId: file.id, userId: req.user!.id, enabled: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { createdAt: 'desc' },
    })
    const generalAccess = share ? 'anyone' : 'restricted'
    const shareUrl = share?.token ? `${env.FRONTEND_URL}/public/files/${share.token}` : null

    return res.json({
      fileId: file.id,
      fileName: file.name,
      provider: file.provider,
      generalAccess,
      role: 'reader',
      isInherited: false,
      inheritedFrom: null,
      parentName: null,
      shareUrl,
      driveUrl: null,
    })
  } catch (error) {
    return next(error)
  }
})

fileRouter.put('/:id/permissions', async (req: AuthRequest, res, next) => {
  try {
    const fileId = String(req.params.id)
    const body = z.object({
      generalAccess: z.enum(['restricted', 'anyone']),
      role: z.enum(['reader', 'commenter', 'writer']).default('reader'),
      cascadeParent: z.boolean().optional(),
    }).parse(req.body)

    const file = await prisma.file.findFirst({
      where: {
        OR: [
          { id: fileId, userId: req.user!.id },
          { providerFileId: fileId, userId: req.user!.id },
          { id: fileId },
          { providerFileId: fileId },
        ],
        status: 'active',
      },
      include: { connectedAccount: true },
    })

    if (!file) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'File not found.' })
    }

    if (file.provider === 'google_drive' && file.providerFileId) {
      if (!file.connectedAccount) {
        return res.status(400).json({ code: 'ACCOUNT_NOT_FOUND', message: 'Connected Google account not found.' })
      }
      const auth = await getAuthedGoogleClient(file.connectedAccount)
      const drive = google.drive({ version: 'v3', auth })

      const permList = await drive.permissions.list({
        fileId: file.providerFileId,
        fields: 'permissions(id, role, type, permissionDetails)',
        supportsAllDrives: true,
      })
      const anyonePerm = permList.data.permissions?.find((p) => p.type === 'anyone')
      const inheritedDetail = (anyonePerm as any)?.permissionDetails?.find((d: any) => d.inherited)
      const isInherited = Boolean((anyonePerm as any)?.inherited || inheritedDetail)

      if (body.generalAccess === 'restricted') {
        if (anyonePerm?.id) {
          if (isInherited) {
            const origin = await findInheritedPermissionOrigin(drive, file.providerFileId)
            const targetOriginId = origin?.id
            if (body.cascadeParent && targetOriginId) {
              try {
                await drive.permissions.delete({
                  fileId: targetOriginId,
                  permissionId: origin?.permissionId ?? anyonePerm.id,
                  supportsAllDrives: true,
                })
              } catch (delParentErr: any) {
                console.error('Failed to cascade delete permission on parent:', delParentErr)
                return res.status(400).json({
                  code: 'FAILED_CASCADE_PARENT',
                  message: 'Gagal mengubah izin folder induk: ' + (delParentErr.message || delParentErr),
                })
              }
            } else {
              return res.status(400).json({
                code: 'PERMISSION_INHERITED',
                inheritedFrom: targetOriginId ?? null,
                parentName: origin?.name ?? null,
                message: 'Hak akses publik diwarisi dari folder induk di Google Drive. Untuk mengubahnya menjadi Restricted, ubah pengaturan sharing pada folder induknya.',
              })
            }
          } else {
            try {
              await drive.permissions.delete({
                fileId: file.providerFileId,
                permissionId: anyonePerm.id,
                supportsAllDrives: true,
              })
            } catch (deleteErr: any) {
              const msg = deleteErr?.message || String(deleteErr)
              if (msg.includes('inherited') || msg.includes('cannotDeletePermission')) {
                const origin = await findInheritedPermissionOrigin(drive, file.providerFileId)
                if (body.cascadeParent && origin?.id) {
                  try {
                    await drive.permissions.delete({
                      fileId: origin.id,
                      permissionId: origin.permissionId,
                      supportsAllDrives: true,
                    })
                  } catch (cascadeErr: any) {
                    return res.status(400).json({
                      code: 'FAILED_CASCADE_PARENT',
                      message: 'Gagal mengubah izin folder induk: ' + (cascadeErr.message || cascadeErr),
                    })
                  }
                } else {
                  return res.status(400).json({
                    code: 'PERMISSION_INHERITED',
                    inheritedFrom: origin?.id ?? null,
                    parentName: origin?.name ?? null,
                    message: 'Hak akses publik diwarisi dari folder induk di Google Drive. Untuk mengubahnya menjadi Restricted, ubah pengaturan sharing pada folder induknya.',
                  })
                }
              } else {
                throw deleteErr
              }
            }
          }
        }
      } else {
        if (anyonePerm?.id) {
          if (anyonePerm.role !== body.role) {
            await drive.permissions.update({
              fileId: file.providerFileId,
              permissionId: anyonePerm.id,
              requestBody: { role: body.role },
              supportsAllDrives: true,
            })
          }
        } else {
          await drive.permissions.create({
            fileId: file.providerFileId,
            requestBody: { role: body.role, type: 'anyone' },
            supportsAllDrives: true,
          })
        }
      }

      const driveUrl = `https://drive.google.com/file/d/${file.providerFileId}/view?usp=sharing`
      return res.json({
        status: 'ok',
        generalAccess: body.generalAccess,
        role: body.role,
        isInherited: body.generalAccess === 'restricted' ? false : isInherited,
        shareUrl: driveUrl,
        driveUrl,
      })
    }

    if (body.generalAccess === 'restricted') {
      await prisma.fileShare.updateMany({
        where: { fileId: file.id, userId: req.user!.id, enabled: true },
        data: { enabled: false },
      })
      return res.json({
        status: 'ok',
        generalAccess: 'restricted',
        role: body.role,
        shareUrl: null,
        driveUrl: null,
      })
    } else {
      let share = await prisma.fileShare.findFirst({
        where: { fileId: file.id, userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
      })
      if (!share) {
        const token = randomToken(32)
        share = await prisma.fileShare.create({
          data: { fileId: file.id, userId: req.user!.id, token, tokenHash: hashToken(token), enabled: true },
        })
      } else if (!share.enabled) {
        share = await prisma.fileShare.update({
          where: { id: share.id },
          data: { enabled: true },
        })
      }
      return res.json({
        status: 'ok',
        generalAccess: 'anyone',
        role: body.role,
        shareUrl: share.token ? `${env.FRONTEND_URL}/public/files/${share.token}` : null,
        driveUrl: null,
      })
    }
  } catch (error) {
    return next(error)
  }
})

fileRouter.post('/:id/public-permission', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const fileId = String(req.params.id)
    const file = await prisma.file.findFirstOrThrow({ where: { id: fileId, userId: req.user!.id }, include: { connectedAccount: true } })
    if (file.provider !== 'google_drive') {
      return res.status(400).json({ code: 'UNSUPPORTED_PROVIDER', message: 'Only Google Drive files can be made public.' })
    }
    const auth = await getAuthedGoogleClient(file.connectedAccount)
    const drive = google.drive({ version: 'v3', auth })
    await drive.permissions.create({
      fileId: file.providerFileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    })
    const metadata = await drive.files.get({ fileId: file.providerFileId, fields: 'webViewLink,webContentLink' })
    return res.json({ status: 'ok', url: metadata.data.webViewLink ?? `https://drive.google.com/file/d/${file.providerFileId}/view?usp=sharing` })
  } catch (error: any) {
    return res.status(500).json({ code: 'GOOGLE_API_ERROR', message: error.message || 'Failed to update Google Drive permissions.' })
  }
})

fileRouter.delete('/:id/share', async (req: AuthRequest, res, next) => {
  try {
    const fileId = String(req.params.id)
    await prisma.fileShare.updateMany({ where: { fileId, userId: req.user!.id, enabled: true }, data: { enabled: false } })
    return res.json({ status: 'ok' })
  } catch (error) {
    return next(error)
  }
})

fileRouter.post('/:id/preview-token', async (req: AuthRequest, res, next) => {
  try {
    const fileId = String(req.params.id)
    const file = await prisma.file.findFirstOrThrow({ where: { id: fileId, userId: req.user!.id, status: 'active' } })
    const token = randomToken(32)
    await prisma.filePreviewToken.create({ data: { fileId: file.id, userId: req.user!.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 10 * 60_000) } })
    const path = `/files/preview/${token}`
    return res.status(201).json({ path, url: `${req.protocol}://${req.get('host')}${path}` })
  } catch (error) {
    return next(error)
  }
})

fileRouter.get('/:id/view-url', async (req: AuthRequest, res, next) => {
  try {
    const fileId = String(req.params.id)
    const file = await prisma.file.findFirstOrThrow({ where: { id: fileId, userId: req.user!.id }, include: { connectedAccount: true } })
    if (file.provider === 'google_drive' && file.providerFileId) {
      return res.json({ url: `https://drive.google.com/file/d/${file.providerFileId}/view?usp=sharing` })
    }
    return res.json({ url: null })
  } catch (error) {
    return next(error)
  }
})

fileRouter.get('/:id/download', async (req: AuthRequest, res, next) => {
  try {
    const fileId = String(req.params.id)
    const file = await prisma.file.findFirstOrThrow({ where: { id: fileId, userId: req.user!.id }, include: { connectedAccount: true } })
    return streamProviderFile(file, req.headers.range, res, { disposition: 'attachment' })
  } catch (error) {
    return next(error)
  }
})

fileRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const fileId = String(req.params.id)
    const file = await prisma.file.findFirstOrThrow({ where: { id: fileId, userId: req.user!.id, status: 'active' } })
    await prisma.file.update({ where: { id: file.id }, data: { status: 'deleted', deletedAt: new Date() } })
    await createAuditLog(req.user!.id, 'TRASH_FILE', 'file', file.id, { name: file.name })
    return res.json({ status: 'ok' })
  } catch (error) {
    return next(error)
  }
})

fileRouter.post('/batch-download', async (req: AuthRequest, res, next) => {
  try {
    const body = batchFileSchema.parse(req.body)
    const files = await prisma.file.findMany({
      where: { id: { in: body.fileIds }, userId: req.user!.id, status: 'active' },
      include: { connectedAccount: true }
    })
    if (files.length === 0) return res.status(404).json({ code: 'FILES_NOT_FOUND', message: 'No files found.' })

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', 'attachment; filename="9drive-download.zip"')

    const archive = new ZipArchive({ zlib: { level: 9 } })
    archive.on('error', (err: any) => {
      throw err
    })
    archive.pipe(res)

    for (const file of files) {
      try {
        let stream: Readable
        let fileName = file.name
        if (file.provider === 's3') {
          const config = await getS3ConfigForAccount(file.connectedAccountId)
          const client = createS3Client(config)
          const response = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: file.providerFileId }))
          stream = response.Body as Readable
        } else {
          const auth = await getAuthedGoogleClient(file.connectedAccount)
          const headers = normalizeHeaders(await auth.getRequestHeaders())
          const exportTarget = googleDownloadExportMimeTypes[file.mimeType]
          if (exportTarget) {
            fileName = withExtension(file.name, exportTarget.extension)
          }
          const url = exportTarget
            ? `https://www.googleapis.com/drive/v3/files/${file.providerFileId}/export?mimeType=${encodeURIComponent(exportTarget.mimeType)}`
            : `https://www.googleapis.com/drive/v3/files/${file.providerFileId}?alt=media`
          const response = await fetch(url, { headers })
          if (!response.ok || !response.body) continue
          stream = Readable.fromWeb(response.body as any)
        }
        archive.append(stream, { name: fileName })
      } catch (err) {
        console.error(`Failed to add file ${file.name} to zip:`, err)
      }
    }

    await archive.finalize()
  } catch (error) {
    return next(error)
  }
})

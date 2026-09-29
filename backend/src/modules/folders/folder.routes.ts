import { Router } from 'express'
import { google } from 'googleapis'
import { z } from 'zod'
import { prisma } from '../../config/prisma.js'
import { requireAuth, type AuthRequest } from '../../middleware/auth.middleware.js'
import { getAuthedGoogleClient, syncGoogleQuota, ensureGoogleAppFolder, findInheritedPermissionOrigin } from '../google/google.service.js'
import { createAuditLog } from '../../utils/audit.js'

export const folderRouter = Router()
folderRouter.use(requireAuth)

const defaultFolderColor = '#3b82f6'
const defaultFolderIconUrl = 'https://api.iconify.design/lucide:folder.svg'
const iconUrlSchema = z.string().url().startsWith('https://api.iconify.design/lucide:').max(2048)
const colorSchema = z.string().regex(/^(#[0-9a-fA-F]{6}|text-[a-z]+-[0-9]+)$/).max(64)

const createSchema = z.object({
  name: z.string().min(1).max(255),
  color: colorSchema.optional(),
  iconUrl: iconUrlSchema.nullable().optional(),
  parentId: z.string().nullable().optional(),
})

function serializeFolder(folder: { id: string; name: string; color: string; iconUrl?: string | null; parentId?: string | null; providerFolderId?: string | null; createdAt: Date; updatedAt: Date }) {
  return {
    ...folder,
    providerFolderId: folder.providerFolderId ?? null,
    driveUrl: folder.providerFolderId ? `https://drive.google.com/drive/folders/${folder.providerFolderId}` : null,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  }
}

async function ensureProviderFolderIds(
  folders: Array<{ id: string; name: string; parentId: string | null; providerFolderId: string | null }>,
  userId: string
) {
  const foldersWithoutId = folders.filter((f) => !f.providerFolderId)
  if (foldersWithoutId.length === 0) return

  const connectedAccount = await prisma.connectedAccount.findFirst({
    where: { userId, provider: 'google_drive', status: 'connected' }
  })
  if (!connectedAccount) return

  try {
    const auth = await getAuthedGoogleClient(connectedAccount)
    const drive = google.drive({ version: 'v3', auth })
    for (const folder of foldersWithoutId) {
      try {
        let parentGoogleId: string | undefined = undefined
        if (folder.parentId) {
          const parentFolder = await prisma.folder.findFirst({
            where: { id: folder.parentId, userId }
          })
          if (parentFolder?.providerFolderId) {
            parentGoogleId = parentFolder.providerFolderId
          }
        }

        const driveFolder = await drive.files.create({
          requestBody: {
            name: folder.name,
            mimeType: 'application/vnd.google-apps.folder',
            ...(parentGoogleId ? { parents: [parentGoogleId] } : {})
          },
          fields: 'id'
        })

        const gId = driveFolder.data.id ?? null
        if (gId) {
          await prisma.folder.update({
            where: { id: folder.id },
            data: { providerFolderId: gId, connectedAccountId: connectedAccount.id }
          })
          folder.providerFolderId = gId
        }
      } catch (error) {
        console.error(`Failed self-healing for folder ${folder.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Failed self-healing Google Drive auth:', error)
  }
}

folderRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const query = z.object({ parentId: z.string().nullable().optional(), all: z.string().optional() }).parse(req.query)
    const folders = await prisma.folder.findMany({
      where: { userId: req.user!.id, deletedAt: null, ...(query.all === '1' ? {} : { parentId: query.parentId ?? null }) },
      select: { id: true, name: true, color: true, iconUrl: true, parentId: true, providerFolderId: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })
    await ensureProviderFolderIds(folders, req.user!.id)
    return res.json({ folders: folders.map(serializeFolder) })
  } catch (error) {
    return next(error)
  }
})

folderRouter.get('/recent', async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 4), 4)
    const folders = await prisma.folder.findMany({
      where: { userId: req.user!.id, deletedAt: null },
      select: { id: true, name: true, color: true, iconUrl: true, parentId: true, providerFolderId: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
    await ensureProviderFolderIds(folders, req.user!.id)
    return res.json({ folders: folders.map(serializeFolder) })
  } catch (error) {
    return next(error)
  }
})

folderRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const body = createSchema.parse(req.body)
    let parentFolder = null
    if (body.parentId) {
      parentFolder = await prisma.folder.findFirstOrThrow({
        where: { id: body.parentId, userId: req.user!.id, deletedAt: null }
      })
    }

    const connectedAccount = await prisma.connectedAccount.findFirst({
      where: { userId: req.user!.id, provider: 'google_drive', status: 'connected' }
    })

    let providerFolderId: string | null = null
    if (connectedAccount) {
      try {
        const auth = await getAuthedGoogleClient(connectedAccount)
        const drive = google.drive({ version: 'v3', auth })

        let googleParentId: string | undefined = undefined
        if (parentFolder && parentFolder.providerFolderId) {
          googleParentId = parentFolder.providerFolderId
        }

        const driveFolder = await drive.files.create({
          requestBody: {
            name: body.name,
            mimeType: 'application/vnd.google-apps.folder',
            ...(googleParentId ? { parents: [googleParentId] } : {}),
          },
          fields: 'id'
        })
        providerFolderId = driveFolder.data.id ?? null
      } catch (error) {
        console.error('Failed to create folder on Google Drive:', error)
      }
    }

    const folder = await prisma.folder.create({
      data: {
        userId: req.user!.id,
        name: body.name,
        color: body.color ?? defaultFolderColor,
        iconUrl: body.iconUrl ?? defaultFolderIconUrl,
        parentId: body.parentId ?? null,
        providerFolderId,
        connectedAccountId: connectedAccount?.id ?? null
      },
      select: { id: true, name: true, color: true, iconUrl: true, parentId: true, providerFolderId: true, createdAt: true, updatedAt: true },
    })
    await createAuditLog(req.user!.id, 'CREATE_FOLDER', 'folder', folder.id, { name: folder.name })
    return res.status(201).json({ folder: serializeFolder(folder) })
  } catch (error) {
    return next(error)
  }
})

folderRouter.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const body = createSchema.partial().parse(req.body)
    const folderId = String(req.params.id)
    if (body.parentId === folderId) return res.status(400).json({ code: 'FOLDER_INVALID_PARENT', message: 'Folder cannot be moved into itself.' })

    const folderRecord = await prisma.folder.findFirstOrThrow({
      where: { id: folderId, userId: req.user!.id, deletedAt: null },
      include: { connectedAccount: true }
    })

    if (body.parentId) {
      await prisma.folder.findFirstOrThrow({ where: { id: body.parentId, userId: req.user!.id, deletedAt: null } })
      const folders = await prisma.folder.findMany({ where: { userId: req.user!.id, deletedAt: null }, select: { id: true, parentId: true } })
      const descendantIds = new Set<string>([folderId])
      let changed = true
      while (changed) {
        changed = false
        for (const folder of folders) {
          if (folder.parentId && descendantIds.has(folder.parentId) && !descendantIds.has(folder.id)) {
            descendantIds.add(folder.id)
            changed = true
          }
        }
      }
      if (descendantIds.has(body.parentId)) return res.status(400).json({ code: 'FOLDER_INVALID_PARENT', message: 'Folder cannot be moved into itself or a child folder.' })
    }

    // Update name on Google Drive if changed
    if (body.name && folderRecord.providerFolderId && folderRecord.connectedAccount) {
      try {
        const auth = await getAuthedGoogleClient(folderRecord.connectedAccount)
        const drive = google.drive({ version: 'v3', auth })
        await drive.files.update({
          fileId: folderRecord.providerFolderId,
          requestBody: { name: body.name }
        })
      } catch (error) {
        console.error('Failed to rename folder on Google Drive:', error)
      }
    }

    // Update parent on Google Drive if moved
    if (body.parentId !== undefined && folderRecord.providerFolderId && folderRecord.connectedAccount) {
      try {
        const auth = await getAuthedGoogleClient(folderRecord.connectedAccount)
        const drive = google.drive({ version: 'v3', auth })

        let newGoogleParentId = await ensureGoogleAppFolder(folderRecord.connectedAccount)
        if (body.parentId) {
          const newParent = await prisma.folder.findFirst({ where: { id: body.parentId, userId: req.user!.id } })
          if (newParent?.providerFolderId) {
            newGoogleParentId = newParent.providerFolderId
          }
        }

        const fileInfo = await drive.files.get({ fileId: folderRecord.providerFolderId, fields: 'parents' })
        const previousParents = fileInfo.data.parents?.join(',')

        await drive.files.update({
          fileId: folderRecord.providerFolderId,
          addParents: newGoogleParentId,
          removeParents: previousParents,
          fields: 'id, parents'
        })
      } catch (error) {
        console.error('Failed to move folder on Google Drive:', error)
      }
    }

    const folder = await prisma.folder.updateMany({
      where: { id: folderId, userId: req.user!.id, deletedAt: null },
      data: { ...(body.name ? { name: body.name } : {}), ...(body.color ? { color: body.color } : {}), ...(body.iconUrl !== undefined ? { iconUrl: body.iconUrl } : {}), ...(body.parentId !== undefined ? { parentId: body.parentId } : {}) },
    })
    if (folder.count === 0) return res.status(404).json({ code: 'FOLDER_NOT_FOUND', message: 'Folder not found.' })
    const updated = await prisma.folder.findFirstOrThrow({
      where: { id: folderId, userId: req.user!.id },
      select: { id: true, name: true, color: true, iconUrl: true, parentId: true, providerFolderId: true, createdAt: true, updatedAt: true },
    })
    await createAuditLog(req.user!.id, 'UPDATE_FOLDER', 'folder', updated.id, { name: updated.name, updates: body })
    return res.json({ folder: serializeFolder(updated) })
  } catch (error) {
    return next(error)
  }
})

folderRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const rootId = String(req.params.id)
    const root = await prisma.folder.findFirstOrThrow({ where: { id: rootId, userId: req.user!.id, deletedAt: null } })
    const folders = await prisma.folder.findMany({ where: { userId: req.user!.id, deletedAt: null }, select: { id: true, parentId: true } })
    const folderIds = new Set<string>([root.id])
    let changed = true
    while (changed) {
      changed = false
      for (const folder of folders) {
        if (folder.parentId && folderIds.has(folder.parentId) && !folderIds.has(folder.id)) {
          folderIds.add(folder.id)
          changed = true
        }
      }
    }

    const files = await prisma.file.findMany({ where: { userId: req.user!.id, status: 'active', folderId: { in: [...folderIds] } }, include: { connectedAccount: true } })
    const syncedAccountIds = new Set<string>()
    for (const file of files) {
      try {
        const auth = await getAuthedGoogleClient(file.connectedAccount)
        const drive = google.drive({ version: 'v3', auth })
        await drive.files.delete({ fileId: file.providerFileId })
        syncedAccountIds.add(file.connectedAccountId)
      } catch {
        // Keep going so one failure does not block the whole deletion
      }
    }

    // Delete folders on Google Drive
    const foldersToDelete = await prisma.folder.findMany({ where: { id: { in: [...folderIds] }, userId: req.user!.id }, include: { connectedAccount: true } })
    for (const f of foldersToDelete) {
      if (f.providerFolderId && f.connectedAccount) {
        try {
          const auth = await getAuthedGoogleClient(f.connectedAccount)
          const drive = google.drive({ version: 'v3', auth })
          await drive.files.delete({ fileId: f.providerFolderId })
          if (f.connectedAccountId) syncedAccountIds.add(f.connectedAccountId)
        } catch {
          // ignore
        }
      }
    }

    await prisma.file.updateMany({ where: { id: { in: files.map((file) => file.id) } }, data: { status: 'deleted', deletedAt: new Date() } })
    await prisma.folder.updateMany({ where: { id: { in: [...folderIds] }, userId: req.user!.id }, data: { deletedAt: new Date() } })
    for (const accountId of syncedAccountIds) await syncGoogleQuota(accountId).catch(() => undefined)

    await createAuditLog(req.user!.id, 'DELETE_FOLDER', 'folder', root.id, { name: root.name })
    return res.json({ status: 'ok' })
  } catch (error) {
    return next(error)
  }
})

folderRouter.get('/:id/permissions', async (req: AuthRequest, res, next) => {
  try {
    const folderId = String(req.params.id)
    const folder = await prisma.folder.findFirst({
      where: {
        OR: [
          { id: folderId, userId: req.user!.id },
          { providerFolderId: folderId, userId: req.user!.id },
          { id: folderId },
          { providerFolderId: folderId },
        ],
        deletedAt: null,
      },
      include: { connectedAccount: true },
    })

    if (!folder) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Folder not found.' })
    }

    let generalAccess: 'restricted' | 'anyone' = 'restricted'
    let role = 'reader'
    let isInherited = false
    let inheritedFrom: string | null = null
    let parentName: string | null = null

    if (folder.providerFolderId) {
      const connectedAccount = folder.connectedAccount ?? (await prisma.connectedAccount.findFirst({
        where: { userId: req.user!.id, provider: 'google_drive', status: 'connected' },
      }))
      if (connectedAccount) {
        try {
          const auth = await getAuthedGoogleClient(connectedAccount)
          const drive = google.drive({ version: 'v3', auth })
          const permList = await drive.permissions.list({
            fileId: folder.providerFolderId,
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
              const origin = await findInheritedPermissionOrigin(drive, folder.providerFolderId)
              if (origin) {
                inheritedFrom = origin.id
                parentName = origin.name
              }
            }
          }
        } catch (err: any) {
          console.error('Failed to query folder permissions:', err.message || err)
        }
      }
    }

    const driveUrl = folder.providerFolderId ? `https://drive.google.com/drive/folders/${folder.providerFolderId}` : null

    return res.json({
      folderId: folder.id,
      name: folder.name,
      generalAccess,
      role,
      isInherited,
      inheritedFrom,
      parentName,
      shareUrl: driveUrl,
      driveUrl,
    })
  } catch (error) {
    return next(error)
  }
})

folderRouter.put('/:id/permissions', async (req: AuthRequest, res, next) => {
  try {
    const folderId = String(req.params.id)
    const body = z.object({
      generalAccess: z.enum(['restricted', 'anyone']),
      role: z.enum(['reader', 'commenter', 'writer']).default('reader'),
      cascadeParent: z.boolean().optional(),
    }).parse(req.body)

    const folder = await prisma.folder.findFirst({
      where: {
        OR: [
          { id: folderId, userId: req.user!.id },
          { providerFolderId: folderId, userId: req.user!.id },
          { id: folderId },
          { providerFolderId: folderId },
        ],
        deletedAt: null,
      },
      include: { connectedAccount: true },
    })

    if (!folder) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Folder not found.' })
    }

    if (!folder.providerFolderId) {
      return res.status(400).json({ code: 'NO_PROVIDER_FOLDER_ID', message: 'Folder does not have a connected Google Drive folder.' })
    }

    const connectedAccount = folder.connectedAccount ?? (await prisma.connectedAccount.findFirst({
      where: { userId: req.user!.id, provider: 'google_drive', status: 'connected' },
    }))
    if (!connectedAccount) {
      return res.status(400).json({ code: 'ACCOUNT_NOT_FOUND', message: 'Connected Google account not found.' })
    }

    const auth = await getAuthedGoogleClient(connectedAccount)
    const drive = google.drive({ version: 'v3', auth })

    const permList = await drive.permissions.list({
      fileId: folder.providerFolderId,
      fields: 'permissions(id, role, type, permissionDetails)',
      supportsAllDrives: true,
    })
    const anyonePerm = permList.data.permissions?.find((p) => p.type === 'anyone')
    const inheritedDetail = (anyonePerm as any)?.permissionDetails?.find((d: any) => d.inherited)
    const isInherited = Boolean((anyonePerm as any)?.inherited || inheritedDetail)

    if (body.generalAccess === 'restricted') {
      if (anyonePerm?.id) {
        if (isInherited) {
          const origin = await findInheritedPermissionOrigin(drive, folder.providerFolderId)
          const targetOriginId = origin?.id
          if (body.cascadeParent && targetOriginId) {
            try {
              await drive.permissions.delete({
                fileId: targetOriginId,
                permissionId: origin?.permissionId ?? anyonePerm.id,
                supportsAllDrives: true,
              })
            } catch (delParentErr: any) {
              console.error('Failed to cascade delete permission on parent folder:', delParentErr)
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
              fileId: folder.providerFolderId,
              permissionId: anyonePerm.id,
              supportsAllDrives: true,
            })
          } catch (deleteErr: any) {
            const msg = deleteErr?.message || String(deleteErr)
            if (msg.includes('inherited') || msg.includes('cannotDeletePermission')) {
              const origin = await findInheritedPermissionOrigin(drive, folder.providerFolderId)
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
            fileId: folder.providerFolderId,
            permissionId: anyonePerm.id,
            requestBody: { role: body.role },
            supportsAllDrives: true,
          })
        }
      } else {
        await drive.permissions.create({
          fileId: folder.providerFolderId,
          requestBody: { role: body.role, type: 'anyone' },
          supportsAllDrives: true,
        })
      }
    }

    const driveUrl = `https://drive.google.com/drive/folders/${folder.providerFolderId}`
    return res.json({
      status: 'ok',
      generalAccess: body.generalAccess,
      role: body.role,
      isInherited: body.generalAccess === 'restricted' ? false : isInherited,
      shareUrl: driveUrl,
      driveUrl,
    })
  } catch (error) {
    return next(error)
  }
})

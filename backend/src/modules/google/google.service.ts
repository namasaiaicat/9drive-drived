import { google } from 'googleapis'
import type { ConnectedAccount, ProviderConfig } from '@prisma/client'
import { prisma } from '../../config/prisma.js'
import { decryptText, encryptText } from '../../utils/crypto.js'

const googleDriveFolderMimeType = 'application/vnd.google-apps.folder'
const appFolderName = '9drive'

export function createOAuthClient(config: ProviderConfig) {
  return new google.auth.OAuth2(decryptText(config.clientIdEncrypted), decryptText(config.clientSecretEncrypted), config.redirectUri)
}

export async function getAuthedGoogleClient(account: ConnectedAccount) {
  if (!account.accessTokenEncrypted || !account.refreshTokenEncrypted || !account.tokenExpiresAt) throw new Error('Google account tokens are missing.')
  if (!account.providerConfigId) throw new Error('Google provider config is missing.')
  const config = await prisma.providerConfig.findUniqueOrThrow({ where: { id: account.providerConfigId } })
  const client = createOAuthClient(config)
  client.setCredentials({
    access_token: decryptText(account.accessTokenEncrypted),
    refresh_token: decryptText(account.refreshTokenEncrypted),
    expiry_date: account.tokenExpiresAt.getTime(),
  })

  if (account.tokenExpiresAt.getTime() < Date.now() + 60_000) {
    const result = await client.refreshAccessToken()
    const credentials = result.credentials
    if (credentials.access_token) {
      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEncrypted: encryptText(credentials.access_token),
          tokenExpiresAt: new Date(credentials.expiry_date ?? Date.now() + 3600_000),
        },
      })
      client.setCredentials(credentials)
    }
  }

  return client
}

export async function syncGoogleQuota(accountId: string) {
  const account = await prisma.connectedAccount.findUniqueOrThrow({ where: { id: accountId } })
  const auth = await getAuthedGoogleClient(account)
  const drive = google.drive({ version: 'v3', auth })
  const about = await drive.about.get({ fields: 'storageQuota,user' })
  const quota = about.data.storageQuota
  const total = quota?.limit ? BigInt(quota.limit) : null
  const used = quota?.usage ? BigInt(quota.usage) : 0n
  return prisma.storageAccount.upsert({
    where: { connectedAccountId: accountId },
    create: {
      connectedAccountId: accountId,
      totalBytes: total,
      usedBytes: used,
      availableBytes: total === null ? null : total - used,
      trashBytes: quota?.usageInDriveTrash ? BigInt(quota.usageInDriveTrash) : null,
      lastSyncedAt: new Date(),
    },
    update: {
      totalBytes: total,
      usedBytes: used,
      availableBytes: total === null ? null : total - used,
      trashBytes: quota?.usageInDriveTrash ? BigInt(quota.usageInDriveTrash) : null,
      lastSyncedAt: new Date(),
    },
  })
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export async function ensureGoogleAppFolder(account: ConnectedAccount) {
  const auth = await getAuthedGoogleClient(account)
  const drive = google.drive({ version: 'v3', auth })
  const queryName = escapeDriveQueryValue(appFolderName)
  const existing = await drive.files.list({
    q: `name = '${queryName}' and mimeType = '${googleDriveFolderMimeType}' and 'root' in parents and trashed = false`,
    spaces: 'drive',
    fields: 'files(id,name)',
    pageSize: 1,
  })
  const folderId = existing.data.files?.[0]?.id ?? (await drive.files.create({
    requestBody: { name: appFolderName, mimeType: googleDriveFolderMimeType, parents: ['root'] },
    fields: 'id',
  })).data.id

  if (!folderId) throw new Error('Failed to create Google Drive app folder.')
  return folderId
}

export type GoogleAppFolderSyncResult = {
  accountId: string
  created: number
  updated: number
  deleted: number
}

export async function syncGoogleAppFolderFiles(accountId: string, userId: string): Promise<GoogleAppFolderSyncResult> {
  const account = await prisma.connectedAccount.findFirstOrThrow({ where: { id: accountId, userId, provider: 'google_drive', status: 'connected' } })
  const auth = await getAuthedGoogleClient(account)
  const drive = google.drive({ version: 'v3', auth })

  // 1. Sync ALL folders from Google Drive
  type DriveFolderMetadata = {
    id: string
    name: string
    parentId: string | null
  }
  const driveFolders: DriveFolderMetadata[] = []
  let folderPageToken: string | undefined
  do {
    const response = await drive.files.list({
      q: `mimeType = '${googleDriveFolderMimeType}' and trashed = false`,
      spaces: 'drive',
      fields: 'nextPageToken,files(id,name,parents)',
      pageSize: 1000,
      pageToken: folderPageToken,
    })
    for (const folder of response.data.files ?? []) {
      if (!folder.id || !folder.name) continue
      driveFolders.push({
        id: folder.id,
        name: folder.name,
        parentId: folder.parents?.[0] ?? null,
      })
    }
    folderPageToken = response.data.nextPageToken ?? undefined
  } while (folderPageToken)

  const existingFolders = await prisma.folder.findMany({
    where: { userId, connectedAccountId: account.id },
  })
  const existingFolderByProviderId = new Map(
    existingFolders.filter((f) => f.providerFolderId).map((f) => [f.providerFolderId!, f])
  )
  const gdriveFolderIdToDbFolder = new Map<string, typeof existingFolders[0]>()

  for (const driveFolder of driveFolders) {
    let dbFolder = existingFolderByProviderId.get(driveFolder.id)
    if (!dbFolder) {
      dbFolder = await prisma.folder.create({
        data: {
          userId,
          connectedAccountId: account.id,
          provider: 'google_drive',
          providerFolderId: driveFolder.id,
          name: driveFolder.name,
          color: 'text-blue-500',
        },
      })
      existingFolderByProviderId.set(driveFolder.id, dbFolder)
    } else {
      if (dbFolder.name !== driveFolder.name || dbFolder.deletedAt !== null) {
        dbFolder = await prisma.folder.update({
          where: { id: dbFolder.id },
          data: { name: driveFolder.name, deletedAt: null },
        })
      }
    }
    gdriveFolderIdToDbFolder.set(driveFolder.id, dbFolder)
  }

  // Set parentId relationships among synced folders
  for (const driveFolder of driveFolders) {
    const dbFolder = gdriveFolderIdToDbFolder.get(driveFolder.id)
    if (!dbFolder) continue
    const parentDbFolder = driveFolder.parentId ? gdriveFolderIdToDbFolder.get(driveFolder.parentId) : null
    const targetParentId = parentDbFolder ? parentDbFolder.id : null
    if (dbFolder.parentId !== targetParentId) {
      await prisma.folder.update({
        where: { id: dbFolder.id },
        data: { parentId: targetParentId },
      })
      dbFolder.parentId = targetParentId
    }
  }

  // Mark folders missing on Google Drive as deleted
  const driveFolderIds = new Set(driveFolders.map((f) => f.id))
  const missingFolderIds = existingFolders
    .filter((f) => f.deletedAt === null && f.providerFolderId && !driveFolderIds.has(f.providerFolderId))
    .map((f) => f.id)
  if (missingFolderIds.length > 0) {
    await prisma.folder.updateMany({
      where: { id: { in: missingFolderIds } },
      data: { deletedAt: new Date() },
    })
  }

  // 2. Sync ALL non-folder files from Google Drive
  type DriveFileMetadata = {
    id: string
    name: string
    mimeType: string
    sizeBytes: bigint
    parentId: string | null
    createdTime?: string | null
    modifiedTime?: string | null
  }

  const driveFiles: DriveFileMetadata[] = []
  let pageToken: string | undefined

  do {
    const response = await drive.files.list({
      q: `mimeType != '${googleDriveFolderMimeType}' and trashed = false`,
      spaces: 'drive',
      fields: 'nextPageToken,files(id,name,mimeType,size,parents,createdTime,modifiedTime)',
      pageSize: 1000,
      pageToken,
    })
    for (const file of response.data.files ?? []) {
      if (!file.id || !file.name || !file.mimeType) continue
      const parentId = file.parents?.[0] ?? null
      driveFiles.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        sizeBytes: BigInt(file.size ?? 0),
        parentId,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
      })
    }
    pageToken = response.data.nextPageToken ?? undefined
  } while (pageToken)

  const existingFiles = await prisma.file.findMany({ where: { userId, connectedAccountId: account.id, provider: 'google_drive' } })
  const existingByProviderId = new Map(existingFiles.map((file) => [file.providerFileId, file]))
  const driveFileIds = new Set(driveFiles.map((file) => file.id))
  let created = 0
  let updated = 0
  let deleted = 0

  for (const driveFile of driveFiles) {
    const dbFolder = driveFile.parentId ? gdriveFolderIdToDbFolder.get(driveFile.parentId) : null
    const dbFolderId = dbFolder ? dbFolder.id : null
    const existing = existingByProviderId.get(driveFile.id)
    if (!existing) {
      await prisma.file.create({
        data: {
          userId,
          connectedAccountId: account.id,
          provider: 'google_drive',
          providerFileId: driveFile.id,
          name: driveFile.name,
          mimeType: driveFile.mimeType,
          sizeBytes: driveFile.sizeBytes,
          status: 'active',
          folderId: dbFolderId,
          createdAt: driveFile.createdTime ? new Date(driveFile.createdTime) : new Date(),
          updatedAt: driveFile.modifiedTime ? new Date(driveFile.modifiedTime) : new Date(),
        },
      })
      created += 1
      continue
    }

    const needsUpdate =
      existing.name !== driveFile.name ||
      existing.mimeType !== driveFile.mimeType ||
      existing.sizeBytes !== driveFile.sizeBytes ||
      existing.status !== 'active' ||
      existing.deletedAt !== null ||
      existing.folderId !== dbFolderId
    if (needsUpdate) {
      await prisma.file.update({
        where: { id: existing.id },
        data: {
          name: driveFile.name,
          mimeType: driveFile.mimeType,
          sizeBytes: driveFile.sizeBytes,
          status: 'active',
          deletedAt: null,
          folderId: dbFolderId,
          ...(driveFile.modifiedTime ? { updatedAt: new Date(driveFile.modifiedTime) } : {}),
        },
      })
      updated += 1
    }
  }

  const missingActiveIds = existingFiles.filter((file) => file.status === 'active' && !driveFileIds.has(file.providerFileId)).map((file) => file.id)
  if (missingActiveIds.length > 0) {
    const result = await prisma.file.updateMany({ where: { id: { in: missingActiveIds }, userId }, data: { status: 'deleted', deletedAt: new Date() } })
    deleted = result.count
  }

  await syncGoogleQuota(account.id).catch(() => undefined)
  return { accountId: account.id, created, updated, deleted }
}

export async function getGoogleStarredFiles(accountId: string, userId: string) {
  const account = await prisma.connectedAccount.findFirstOrThrow({ where: { id: accountId, userId, provider: 'google_drive', status: 'connected' } })
  const auth = await getAuthedGoogleClient(account)
  const drive = google.drive({ version: 'v3', auth })

  const response = await drive.files.list({
    q: 'starred = true and trashed = false',
    spaces: 'drive',
    fields: 'files(id,name,mimeType,size,parents,createdTime,modifiedTime,webViewLink)',
    pageSize: 100,
  })

  // Look up folder names from DB if available
  const existingFiles = await prisma.file.findMany({
    where: { userId, connectedAccountId: account.id, providerFileId: { in: (response.data.files ?? []).map((f) => f.id!).filter(Boolean) } },
    include: { folder: { select: { id: true, name: true } } },
  })
  const fileByProviderId = new Map(existingFiles.map((f) => [f.providerFileId, f]))

  return (response.data.files ?? []).map((f) => {
    const dbFile = f.id ? fileByProviderId.get(f.id) : null
    return {
      id: dbFile?.id ?? f.id ?? '',
      providerFileId: f.id ?? '',
      name: f.name ?? 'Untitled',
      mimeType: f.mimeType ?? 'application/octet-stream',
      sizeBytes: String(f.size ?? '0'),
      createdAt: f.createdTime ?? new Date().toISOString(),
      updatedAt: f.modifiedTime ?? f.createdTime ?? new Date().toISOString(),
      folderId: dbFile?.folderId ?? null,
      folder: dbFile?.folder ?? null,
      connectedAccount: { id: account.id, email: account.email, provider: 'google_drive' },
      driveUrl: (f as any).webViewLink ?? (f.id ? `https://drive.google.com/file/d/${f.id}/view?usp=sharing` : null),
    }
  })
}

export async function getGoogleRecentFiles(accountId: string, userId: string) {
  const account = await prisma.connectedAccount.findFirstOrThrow({ where: { id: accountId, userId, provider: 'google_drive', status: 'connected' } })
  const auth = await getAuthedGoogleClient(account)
  const drive = google.drive({ version: 'v3', auth })

  const response = await drive.files.list({
    q: `mimeType != '${googleDriveFolderMimeType}' and trashed = false`,
    orderBy: 'viewedByMeTime desc, modifiedTime desc',
    spaces: 'drive',
    fields: 'files(id,name,mimeType,size,parents,createdTime,modifiedTime,viewedByMeTime,webViewLink)',
    pageSize: 50,
  })

  const existingFiles = await prisma.file.findMany({
    where: { userId, connectedAccountId: account.id, providerFileId: { in: (response.data.files ?? []).map((f) => f.id!).filter(Boolean) } },
    include: { folder: { select: { id: true, name: true } } },
  })
  const fileByProviderId = new Map(existingFiles.map((f) => [f.providerFileId, f]))

  return (response.data.files ?? []).map((f) => {
    const dbFile = f.id ? fileByProviderId.get(f.id) : null
    return {
      id: dbFile?.id ?? f.id ?? '',
      providerFileId: f.id ?? '',
      name: f.name ?? 'Untitled',
      mimeType: f.mimeType ?? 'application/octet-stream',
      sizeBytes: String(f.size ?? '0'),
      createdAt: f.createdTime ?? new Date().toISOString(),
      updatedAt: f.modifiedTime ?? f.createdTime ?? new Date().toISOString(),
      viewedAt: (f as any).viewedByMeTime ?? f.modifiedTime ?? f.createdTime,
      folderId: dbFile?.folderId ?? null,
      folder: dbFile?.folder ?? null,
      connectedAccount: { id: account.id, email: account.email, provider: 'google_drive' },
      driveUrl: (f as any).webViewLink ?? (f.id ? `https://drive.google.com/file/d/${f.id}/view?usp=sharing` : null),
    }
  })
}

export async function getGoogleSharedFiles(accountId: string, userId: string) {
  const account = await prisma.connectedAccount.findFirstOrThrow({
    where: { id: accountId, userId, provider: 'google_drive', status: 'connected' },
  })
  const auth = await getAuthedGoogleClient(account)
  const drive = google.drive({ version: 'v3', auth })

  const response = await drive.files.list({
    q: 'sharedWithMe = true and trashed = false',
    orderBy: 'sharedWithMeTime desc',
    spaces: 'drive',
    fields: 'files(id,name,mimeType,size,parents,createdTime,modifiedTime,sharedWithMeTime,sharingUser(displayName,emailAddress,photoLink),owners(displayName,emailAddress,photoLink),webViewLink,iconLink)',
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  const rawItems = response.data.files ?? []
  const rawFolders = rawItems.filter((f) => f.mimeType === googleDriveFolderMimeType)
  const rawFiles = rawItems.filter((f) => f.mimeType !== googleDriveFolderMimeType)

  // Find or create DB records for shared folders
  const folderByProviderId = new Map()
  for (const rf of rawFolders) {
    if (!rf.id || !rf.name) continue
    let dbFolder = await prisma.folder.findFirst({
      where: { userId, connectedAccountId: account.id, providerFolderId: rf.id },
    })
    if (!dbFolder) {
      dbFolder = await prisma.folder.create({
        data: {
          userId,
          connectedAccountId: account.id,
          provider: 'google_drive',
          providerFolderId: rf.id,
          name: rf.name,
          color: 'text-blue-500',
        },
      })
    }
    folderByProviderId.set(rf.id, dbFolder)
  }

  // Find or create DB records for shared files (needed for preview & download streaming)
  const fileByProviderId = new Map()
  for (const rf of rawFiles) {
    if (!rf.id || !rf.name) continue
    let dbFile = await prisma.file.findFirst({
      where: { userId, connectedAccountId: account.id, providerFileId: rf.id },
      include: { folder: { select: { id: true, name: true } } },
    })
    if (!dbFile) {
      dbFile = await prisma.file.create({
        data: {
          userId,
          connectedAccountId: account.id,
          provider: 'google_drive',
          providerFileId: rf.id,
          name: rf.name,
          mimeType: rf.mimeType ?? 'application/octet-stream',
          sizeBytes: BigInt(rf.size ?? 0),
          status: 'active',
        },
        include: { folder: { select: { id: true, name: true } } },
      })
    }
    fileByProviderId.set(rf.id, dbFile)
  }

  const folders = rawFolders.map((f) => {
    const dbFolder = f.id ? folderByProviderId.get(f.id) : null
    const ownerName =
      f.sharingUser?.displayName ||
      f.sharingUser?.emailAddress ||
      f.owners?.[0]?.displayName ||
      f.owners?.[0]?.emailAddress ||
      'Shared'
    return {
      id: dbFolder?.id ?? f.id ?? '',
      name: f.name ?? 'Untitled Folder',
      updated: (f as any).sharedWithMeTime ?? f.modifiedTime ?? f.createdTime ?? new Date().toISOString(),
      color: 'text-blue-500',
      iconUrl: (f as any).iconLink ?? null,
      providerFolderId: f.id ?? null,
      driveUrl: (f as any).webViewLink ?? (f.id ? `https://drive.google.com/drive/folders/${f.id}` : undefined),
      owner: ownerName,
      connectedAccount: { id: account.id, email: account.email, provider: 'google_drive' },
    }
  })

  const files = rawFiles.map((f) => {
    const dbFile = f.id ? fileByProviderId.get(f.id) : null
    const ownerName =
      f.sharingUser?.displayName ||
      f.sharingUser?.emailAddress ||
      f.owners?.[0]?.displayName ||
      f.owners?.[0]?.emailAddress ||
      'Shared'
    return {
      id: dbFile?.id ?? f.id ?? '',
      providerFileId: f.id ?? '',
      name: f.name ?? 'Untitled',
      mimeType: f.mimeType ?? 'application/octet-stream',
      sizeBytes: String(f.size ?? '0'),
      createdAt: f.createdTime ?? new Date().toISOString(),
      updatedAt: f.modifiedTime ?? f.createdTime ?? new Date().toISOString(),
      sharedWithMeTime: (f as any).sharedWithMeTime ?? f.modifiedTime ?? f.createdTime ?? new Date().toISOString(),
      owner: ownerName,
      folderId: dbFile?.folderId ?? null,
      folder: dbFile?.folder ?? null,
      connectedAccount: { id: account.id, email: account.email, provider: 'google_drive' },
      driveUrl: (f as any).webViewLink ?? (f.id ? `https://drive.google.com/file/d/${f.id}/view?usp=sharing` : null),
    }
  })

  return { files, folders }
}


export async function setGoogleFileStarred(accountId: string, userId: string, providerFileId: string, starred: boolean) {
  const account = await prisma.connectedAccount.findFirstOrThrow({ where: { id: accountId, userId, provider: 'google_drive', status: 'connected' } })
  const auth = await getAuthedGoogleClient(account)
  const drive = google.drive({ version: 'v3', auth })
  await drive.files.update({
    fileId: providerFileId,
    requestBody: { starred },
  })
}

export interface InheritedPermissionOrigin {
  id: string
  name: string
  permissionId: string
}

export async function findInheritedPermissionOrigin(
  drive: any,
  startingFileOrFolderId: string
): Promise<InheritedPermissionOrigin | null> {
  let currentId: string | undefined = startingFileOrFolderId
  const visited = new Set<string>()

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    try {
      const fileRes: any = await drive.files.get({
        fileId: currentId,
        fields: 'id, name, parents, permissions(id, type, role, permissionDetails)',
        supportsAllDrives: true,
      })
      const permissions = fileRes.data?.permissions || []
      const anyonePerm = permissions.find((p: any) => p.type === 'anyone' || p.id === 'anyoneWithLink')
      if (anyonePerm) {
        const isInherited = anyonePerm.permissionDetails?.some((d: any) => d.inherited === true)
        if (!isInherited) {
          return {
            id: fileRes.data.id,
            name: fileRes.data.name || 'Folder Induk',
            permissionId: anyonePerm.id || 'anyoneWithLink',
          }
        }
      }
      const parents = fileRes.data?.parents
      if (parents && parents.length > 0) {
        currentId = parents[0]
      } else {
        break
      }
    } catch {
      break
    }
  }
  return null
}


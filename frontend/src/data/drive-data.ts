export type FolderItem = {
  id?: string
  name: string
  updated: string
  color: string
  iconUrl?: string | null
  parentId?: string | null
  providerFolderId?: string | null
  driveUrl?: string
}

export type FileItem = {
  id?: string
  name: string
  mimeType?: string
  date: string
  size: string
  sizeBytes?: string
  access: string
  accountEmail?: string
  accountProvider?: string
  createdAt?: string
  kind: 'doc' | 'image' | 'video' | 'pdf'
  shared: number
  owner?: string
  location?: string
  archivedDate?: string
  starredDate?: string
  openedDate?: string
  folderId?: string | null
  folderName?: string | null
  isStarred?: boolean
  providerFileId?: string
  driveUrl?: string
}

export const folders: FolderItem[] = []
export const files: FileItem[] = []
export const sharedFiles: FileItem[] = []
export const archivedFiles: FileItem[] = []
export const sharedFolders: FolderItem[] = []


import { PrismaClient as MysqlClient } from '@prisma/client'

const dbUrl = process.env.DATABASE_URL || ''
const isSqlite = dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:')

let clientInstance: any = null

if (isSqlite) {
  try {
    // Dynamic synchronous require for CommonJS
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sqliteModule = require('../../prisma/generated/sqlite-client/index.js')
    const SqliteClient = sqliteModule.PrismaClient
    clientInstance = new SqliteClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    })
  } catch (err) {
    console.warn('[Prisma] Could not load SQLite client from generated folder, using default client.')
    clientInstance = new MysqlClient()
  }
} else {
  clientInstance = new MysqlClient()
}

export const prisma: MysqlClient = clientInstance


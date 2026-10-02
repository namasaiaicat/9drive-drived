import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

// Support ~/.9drive config directory for CLI & local-first zero-config mode
const defaultDataDir = path.join(os.homedir(), '.9drive')
const dataDir = process.env.NINEDRIVE_DATA_DIR || defaultDataDir
const configPath = path.join(dataDir, 'config.json')

let fileConfig: Record<string, any> = {}
if (fs.existsSync(configPath)) {
  try {
    fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  } catch {
    console.warn(`[9Drive] Warning: Could not parse configuration from ${configPath}`)
  }
}

// Generate persistent secrets if not provided
const defaultAccessSecret =
  process.env.JWT_ACCESS_SECRET ||
  fileConfig.JWT_ACCESS_SECRET ||
  crypto.randomBytes(32).toString('hex')

const defaultEncryptionKey =
  process.env.TOKEN_ENCRYPTION_KEY ||
  fileConfig.TOKEN_ENCRYPTION_KEY ||
  crypto.randomBytes(32).toString('hex')

const defaultPort = Number(process.env.APP_PORT || fileConfig.APP_PORT || 4000)
const defaultFrontendUrl =
  process.env.FRONTEND_URL || fileConfig.FRONTEND_URL || `http://localhost:${defaultPort}`

// Standard database URL: if not given in env or config, fallback to local sqlite in ~/.9drive/9drive.db
const defaultDbPath = path.join(dataDir, '9drive.db').replace(/\\/g, '/')
const defaultDatabaseUrl =
  process.env.DATABASE_URL || fileConfig.DATABASE_URL || `file:${defaultDbPath}`

// Auto-save generated config if running in CLI mode or without explicit .env file
if (!fs.existsSync(configPath) && (process.env.NINEDRIVE_CLI === 'true' || !process.env.DATABASE_URL)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          APP_PORT: defaultPort,
          DATABASE_URL: defaultDatabaseUrl,
          FRONTEND_URL: defaultFrontendUrl,
          JWT_ACCESS_SECRET: defaultAccessSecret,
          TOKEN_ENCRYPTION_KEY: defaultEncryptionKey,
        },
        null,
        2
      )
    )
  } catch {}
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  TOKEN_ENCRYPTION_KEY: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  MAX_UPLOAD_BYTES: z.coerce.number().default(5 * 1024 * 1024 * 1024),
  RECAPTCHA_SECRET_KEY: z.string().optional(),
  CDN_BASE_URL: z.string().optional(),
  SERVE_FRONTEND: z.coerce.boolean().default(false),
  NINEDRIVE_DATA_DIR: z.string().default(dataDir),
})

export const env = envSchema.parse({
  ...fileConfig,
  DATABASE_URL: defaultDatabaseUrl,
  APP_PORT: defaultPort,
  FRONTEND_URL: defaultFrontendUrl,
  JWT_ACCESS_SECRET: defaultAccessSecret,
  TOKEN_ENCRYPTION_KEY: defaultEncryptionKey,
  ...process.env,
})


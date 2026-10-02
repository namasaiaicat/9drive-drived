#!/usr/bin/env node

/**
 * 9Drive CLI Launcher
 * Zero-config Local-First Storage Cloud Server
 */

const fs = require('fs')
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const { spawn, execSync } = require('child_process')

// Version from root package.json
let version = '1.0.0'
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'))
  if (pkg.version) version = pkg.version
} catch {}

const BANNER = `
  \x1b[36m    _   ___            ____       _           \x1b[0m
  \x1b[36m   / | / (_)___  ___  / __ \\_____(_)   _____ \x1b[0m
  \x1b[36m  /  |/ / / __ \\/ _ \\/ / / / ___/ / | / / _ \\\x1b[0m
  \x1b[36m / /|  / / / / /  __/ /_/ / /  / /| |/ /  __/\x1b[0m
  \x1b[36m/_/ |_/_/_/ /_/\\___/_____/_/  /_/ |___/\\___/ \x1b[33mv${version}\x1b[0m
  \x1b[90m Cloud Storage & Universal API Gateway\x1b[0m
`

function printHelp() {
  console.log(BANNER)
  console.log(`
Usage:
  9drive [command] [options]

Commands:
  start          Start the 9Drive local server (default)
  status         Show 9Drive data directory, database, and configuration
  shortcut       Create a Desktop shortcut / launcher (Windows, macOS, Linux)
  backup         Create an instant backup of the local database
  open           Open the 9Drive Web UI in your default browser

Options:
  --port <num>   Port number to run 9Drive on (default: 9999 or from config)
  --host <str>   Host to bind server (default: localhost)
  --db <url>     Custom database URL (SQLite file:... or MySQL mysql://...)
  --no-open      Do not open the browser automatically upon launch
  --help, -h     Show this help message
  --version, -v  Show version number

Examples:
  npx 9drive
  npm i -g 9drive && 9drive shortcut
  9drive start --port 8080
  9drive status
  9drive shortcut
`)
}

// Parse command line arguments
const args = process.argv.slice(2)
let command = 'start'
let portArg = null
let dbArg = null
let noOpen = false

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--help' || arg === '-h') {
    printHelp()
    process.exit(0)
  }
  if (arg === '--version' || arg === '-v') {
    console.log(`9Drive v${version}`)
    process.exit(0)
  }
  if (arg === '--port') {
    portArg = Number(args[++i])
  } else if (arg === '--db') {
    dbArg = args[++i]
  } else if (arg === '--no-open') {
    noOpen = true
  } else if (!arg.startsWith('-') && i === 0) {
    command = arg
  }
}

// Setup user data directory: ~/.9drive/
const homeDir = os.homedir()
const dataDir = process.env.NINEDRIVE_DATA_DIR || path.join(homeDir, '.9drive')
const backupsDir = path.join(dataDir, 'backups')
const storageDir = path.join(dataDir, 'storage')
const configPath = path.join(dataDir, 'config.json')
const sqliteDbPath = path.join(dataDir, '9drive.db')

function ensureDirectories() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true })
  if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true })
}

function loadOrCreateConfig() {
  ensureDirectories()
  let config = {}
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    } catch {}
  }

  const defaultPort = portArg || config.APP_PORT || 9999
  const defaultDatabaseUrl = dbArg || config.DATABASE_URL || `file:${sqliteDbPath.replace(/\\/g, '/')}`
  const defaultFrontendUrl = config.FRONTEND_URL || `http://localhost:${defaultPort}`
  const defaultJwtSecret = config.JWT_ACCESS_SECRET || crypto.randomBytes(32).toString('hex')
  const defaultEncryptionKey = config.TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')

  const updatedConfig = {
    APP_PORT: defaultPort,
    DATABASE_URL: defaultDatabaseUrl,
    FRONTEND_URL: defaultFrontendUrl,
    JWT_ACCESS_SECRET: defaultJwtSecret,
    TOKEN_ENCRYPTION_KEY: defaultEncryptionKey,
    MAX_UPLOAD_BYTES: config.MAX_UPLOAD_BYTES || 5 * 1024 * 1024 * 1024,
    ...config,
  }

  if (portArg) updatedConfig.APP_PORT = portArg
  if (dbArg) updatedConfig.DATABASE_URL = dbArg

  fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2))
  return updatedConfig
}

function openBrowser(url) {
  const start =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
      ? 'start'
      : 'xdg-open'
  try {
    execSync(`${start} ${url}`, { stdio: 'ignore' })
  } catch {}
}

function handleStatus() {
  ensureDirectories()
  const config = loadOrCreateConfig()
  console.log(BANNER)
  console.log('\x1b[32m[9Drive Status]\x1b[0m')
  console.log(`  Version:         v${version}`)
  console.log(`  Data Directory:  ${dataDir}`)
  console.log(`  Config File:     ${configPath}`)
  console.log(`  Database URL:    ${config.DATABASE_URL}`)
  console.log(`  Configured Port: ${config.APP_PORT}`)

  if (fs.existsSync(sqliteDbPath)) {
    const stats = fs.statSync(sqliteDbPath)
    console.log(`  SQLite DB Size:  ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
  } else {
    console.log(`  SQLite DB Size:  Not initialized yet`)
  }

  const backups = fs.existsSync(backupsDir) ? fs.readdirSync(backupsDir) : []
  console.log(`  Total Backups:   ${backups.length} snapshot(s)`)
}

function handleBackup() {
  ensureDirectories()
  if (!fs.existsSync(sqliteDbPath)) {
    console.log('\x1b[33m[!] No SQLite database found to backup yet.\x1b[0m')
    return
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const destPath = path.join(backupsDir, `9drive-backup-${timestamp}.db`)
  fs.copyFileSync(sqliteDbPath, destPath)
  console.log(`\x1b[32m[✓] Database backup created:\x1b[0m ${destPath}`)
}

function handleShortcut() {
  console.log(BANNER)
  const home = os.homedir()
  const platform = process.platform

  if (platform === 'win32') {
    const iconPath = path.join(__dirname, '../backend/public/favicon.ico')

    const vbsScript = `
      Set oWS = WScript.CreateObject("WScript.Shell")
      sDesktop = oWS.SpecialFolders("Desktop")
      sPrograms = oWS.SpecialFolders("Programs")

      sLinkFile = sDesktop & "\\9Drive.lnk"
      Set oLink = oWS.CreateShortcut(sLinkFile)
      oLink.TargetPath = "cmd.exe"
      oLink.Arguments = "/c 9drive"
      oLink.Description = "9Drive Personal Cloud Storage"
      oLink.WorkingDirectory = "${home.replace(/\\/g, '\\\\')}"
      ${fs.existsSync(iconPath) ? `oLink.IconLocation = "${iconPath.replace(/\\/g, '\\\\')}"` : ''}
      oLink.Save

      On Error Resume Next
      sLinkFile2 = sPrograms & "\\9Drive.lnk"
      Set oLink2 = oWS.CreateShortcut(sLinkFile2)
      oLink2.TargetPath = "cmd.exe"
      oLink2.Arguments = "/c 9drive"
      oLink2.Description = "9Drive Personal Cloud Storage"
      oLink2.WorkingDirectory = "${home.replace(/\\/g, '\\\\')}"
      ${fs.existsSync(iconPath) ? `oLink2.IconLocation = "${iconPath.replace(/\\/g, '\\\\')}"` : ''}
      oLink2.Save

      WScript.Echo sDesktop
    `

    const tempVbs = path.join(os.tmpdir(), `create-9drive-shortcut-${Date.now()}.vbs`)
    try {
      fs.writeFileSync(tempVbs, vbsScript)
      const output = execSync(`cscript //nologo "${tempVbs}"`, { encoding: 'utf8' }).trim()
      try { fs.unlinkSync(tempVbs) } catch {}
      console.log(' \x1b[32m[✓]\x1b[0m Shortcut Desktop Windows berhasil dipasang!')
      console.log(`     Lokasi Desktop:    \x1b[36m${output}\\9Drive.lnk\x1b[0m`)
      console.log('     Sekarang Anda cukup double-click icon "9Drive" di Desktop untuk membuka aplikasi!\n')
    } catch (err) {
      console.log(' \x1b[31m[x]\x1b[0m Gagal membuat shortcut:', err.message)
    }
  } else if (platform === 'darwin') {
    const desktopPath = path.join(home, 'Desktop')
    const commandPath = path.join(desktopPath, '9Drive.command')
    const scriptContent = `#!/bin/bash\n9drive\n`
    try {
      fs.writeFileSync(commandPath, scriptContent)
      fs.chmodSync(commandPath, '755')
      console.log(' \x1b[32m[✓]\x1b[0m macOS Desktop launcher created successfully!')
      console.log(`     Location: \x1b[36m${commandPath}\x1b[0m`)
      console.log('     Double-click the 9Drive.command file to launch!\n')
    } catch (err) {
      console.log(' \x1b[31m[x]\x1b[0m Failed to create shortcut:', err.message)
    }
  } else {
    const desktopDirs = [
      path.join(home, '.local/share/applications'),
      path.join(home, 'Desktop'),
    ]
    const desktopContent = `[Desktop Entry]
Name=9Drive
Comment=Personal Cloud Storage & Universal API Gateway
Exec=9drive
Terminal=false
Type=Application
Categories=Network;FileTransfer;Utility;
`
    let created = false
    for (const dir of desktopDirs) {
      if (fs.existsSync(dir)) {
        const file = path.join(dir, '9drive.desktop')
        try {
          fs.writeFileSync(file, desktopContent)
          fs.chmodSync(file, '755')
          created = true
          console.log(` \x1b[32m[✓]\x1b[0m Linux launcher created: \x1b[36m${file}\x1b[0m`)
        } catch {}
      }
    }
    if (created) {
      console.log('     9Drive is now available in your application launcher!\n')
    }
  }
}

async function handleStart() {
  ensureDirectories()
  const config = loadOrCreateConfig()

  console.log(BANNER)
  console.log(` \x1b[32m[✓]\x1b[0m Data directory:   \x1b[90m${dataDir}\x1b[0m`)

  const shortcutCheck = process.platform === 'win32'
    ? path.join(os.homedir(), 'Desktop/9Drive.lnk')
    : path.join(os.homedir(), 'Desktop/9Drive.command')
  if (!fs.existsSync(shortcutCheck)) {
    console.log(` \x1b[33m[💡 Tip]\x1b[0m Ingin pasang icon di Desktop? Jalankan: \x1b[36m9drive shortcut\x1b[0m`)
  }

  const isSqlite = config.DATABASE_URL.startsWith('file:') || config.DATABASE_URL.startsWith('sqlite:')

  // Auto-backup database on startup if existing SQLite database found
  if (isSqlite && fs.existsSync(sqliteDbPath)) {
    try {
      const stats = fs.statSync(sqliteDbPath)
      if (stats.size > 0) {
        const timestamp = new Date().toISOString().slice(0, 10)
        const autoBackup = path.join(backupsDir, `auto-backup-${timestamp}.db`)
        fs.copyFileSync(sqliteDbPath, autoBackup)
      }
    } catch {}
  }

  // Resolve backend root and prisma
  const backendDir = path.resolve(__dirname, '../backend')
  const rootDir = path.resolve(__dirname, '..')

  // Sync SQLite schema automatically if in SQLite mode
  if (isSqlite) {
    const sqliteSchemaPath = path.join(backendDir, 'prisma/schema.sqlite.prisma')
    const sqliteClientIndex = path.join(backendDir, 'prisma/generated/sqlite-client/index.js')
    const prismaCli = [
      path.join(rootDir, 'node_modules/prisma/build/index.js'),
      path.join(backendDir, 'node_modules/prisma/build/index.js'),
    ].find((p) => fs.existsSync(p)) || null

    if (fs.existsSync(sqliteSchemaPath) && prismaCli) {
      if (!fs.existsSync(sqliteClientIndex)) {
        process.stdout.write(' [⧗] Generating SQLite database client... ')
        try {
          execSync(`node "${prismaCli}" generate --schema="${sqliteSchemaPath}"`, {
            stdio: 'ignore',
            env: { ...process.env, DATABASE_URL: config.DATABASE_URL },
          })
          console.log('\x1b[32m[Ready]\x1b[0m')
        } catch {
          console.log('\x1b[33m[Notice: Generator skipped]\x1b[0m')
        }
      }

      process.stdout.write(' [⧗] Checking database schema... ')
      try {
        execSync(
          `node "${prismaCli}" db push --schema="${sqliteSchemaPath}" --skip-generate`,
          {
            stdio: 'ignore',
            env: {
              ...process.env,
              DATABASE_URL: config.DATABASE_URL,
            },
          }
        )
        console.log('\x1b[32m[Ready]\x1b[0m')
      } catch (err) {
        console.log('\x1b[33m[Notice: Using existing schema]\x1b[0m')
      }
    }
  }

  // Locate server entry file (dist/server.js or src/server.ts)
  let serverEntry = path.join(backendDir, 'dist/server.js')
  let useTsx = false

  if (!fs.existsSync(serverEntry)) {
    serverEntry = path.join(backendDir, 'src/server.ts')
    useTsx = true
  }

  const serverUrl = `http://localhost:${config.APP_PORT}`
  console.log(` \x1b[32m[✓]\x1b[0m Web Dashboard:    \x1b[36m\x1b[4m${serverUrl}\x1b[0m`)
  console.log(` \x1b[90m[i] Press Ctrl+C to stop the server.\x1b[0m\n`)

  const nodePath = [
    path.join(backendDir, 'node_modules'),
    path.join(rootDir, 'node_modules'),
    process.env.NODE_PATH || '',
  ].filter(Boolean).join(path.delimiter)

  const envVars = {
    ...process.env,
    NODE_PATH: nodePath,
    NINEDRIVE_CLI: 'true',
    NINEDRIVE_DATA_DIR: dataDir,
    APP_PORT: String(config.APP_PORT),
    DATABASE_URL: config.DATABASE_URL,
    FRONTEND_URL: config.FRONTEND_URL || serverUrl,
    JWT_ACCESS_SECRET: config.JWT_ACCESS_SECRET,
    TOKEN_ENCRYPTION_KEY: config.TOKEN_ENCRYPTION_KEY,
    SERVE_FRONTEND: 'true',
  }

  const runner = useTsx
    ? path.join(backendDir, 'node_modules/tsx/dist/cli.mjs')
    : null

  const child = runner
    ? spawn('node', [runner, serverEntry], {
        cwd: backendDir,
        env: envVars,
        stdio: 'inherit',
      })
    : spawn('node', [serverEntry], {
        cwd: backendDir,
        env: envVars,
        stdio: 'inherit',
      })

  // Open browser after short delay
  if (!noOpen) {
    setTimeout(() => {
      openBrowser(serverUrl)
    }, 1500)
  }

  child.on('exit', (code) => {
    process.exit(code || 0)
  })
}

// Route commands
switch (command) {
  case 'status':
    handleStatus()
    break
  case 'shortcut':
    handleShortcut()
    break
  case 'backup':
    handleBackup()
    break
  case 'open':
    const conf = loadOrCreateConfig()
    openBrowser(`http://localhost:${conf.APP_PORT}`)
    break
  case 'start':
  default:
    handleStart()
    break
}

/**
 * 9Drive Bundle CLI script
 * Prepares the production bundle for npm publishing
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')
const frontendDir = path.join(rootDir, 'frontend')
const backendDir = path.join(rootDir, 'backend')
const backendPublicDir = path.join(backendDir, 'public')
const frontendDistDir = path.join(frontendDir, 'dist')

console.log('\x1b[36m[9Drive Packager] Starting CLI bundle build...\x1b[0m')

// 1. Build frontend
console.log('1. Building React frontend (Vite)...')
execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' })

// 2. Build backend
console.log('2. Compiling TypeScript backend...')
execSync('npm run build', { cwd: backendDir, stdio: 'inherit' })

// 3. Generate SQLite Prisma client
const sqliteClientIndex = path.join(backendDir, 'prisma/generated/sqlite-client/index.js')
if (!fs.existsSync(sqliteClientIndex)) {
  console.log('3. Generating SQLite Prisma client...')
  execSync('npm run prisma:generate:sqlite', { cwd: backendDir, stdio: 'inherit' })
} else {
  console.log('3. SQLite Prisma client already generated. Skipping to prevent file lock.')
}

// 4. Copy frontend/dist into backend/public
console.log('4. Copying static frontend into backend/public...')
if (fs.existsSync(backendPublicDir)) {
  fs.rmSync(backendPublicDir, { recursive: true, force: true })
}
fs.cpSync(frontendDistDir, backendPublicDir, { recursive: true })

// 5. Clean any lingering tmp files in generated prisma client
const sqliteClientDir = path.join(backendDir, 'prisma/generated/sqlite-client')
if (fs.existsSync(sqliteClientDir)) {
  try {
    fs.readdirSync(sqliteClientDir).forEach((file) => {
      if (file.includes('.tmp')) {
        try { fs.unlinkSync(path.join(sqliteClientDir, file)) } catch {}
      }
    })
  } catch {}
}

console.log('\x1b[32m[✓] 9Drive CLI bundle build complete!\x1b[0m')
console.log('You can now run: \x1b[33mnode bin/9drive.js\x1b[0m or test with \x1b[33mnpm link\x1b[0m')

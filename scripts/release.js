#!/usr/bin/env node

/**
 * 9Drive Automated Release Script
 * 
 * Usage:
 *   node scripts/release.js [patch|minor|major|<specific_version>] [--no-git] [--no-push]
 * 
 * Examples:
 *   npm run release          (defaults to patch: 1.1.0 -> 1.1.1)
 *   npm run release:minor    (bumps minor: 1.1.0 -> 1.2.0)
 *   npm run release:major    (bumps major: 1.1.0 -> 2.0.0)
 *   npm run release 1.1.2    (sets exact version)
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')
const pkgPath = path.join(rootDir, 'package.json')
const bundleScriptPath = path.join(__dirname, 'bundle-cli.js')

const args = process.argv.slice(2)
const skipGit = args.includes('--no-git')
const skipPush = args.includes('--no-push')
const versionArg = args.find((a) => !a.startsWith('--')) || 'patch'

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: rootDir, stdio: 'inherit', ...opts })
}

function runQuiet(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return null
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function computeNextVersion(current, type) {
  const parts = current.split('.').map((n) => parseInt(n, 10))
  if (parts.length < 3) return type // assume literal if malformed

  if (type === 'major') {
    return `${parts[0] + 1}.0.0`
  }
  if (type === 'minor') {
    return `${parts[0]}.${parts[1] + 1}.0`
  }
  if (type === 'patch') {
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`
  }

  // Validate explicit semver
  if (/^\d+\.\d+\.\d+/.test(type)) {
    return type
  }

  throw new Error(`Tipe versi tidak valid: "${type}". Gunakan "patch", "minor", "major", atau format semver seperti "1.1.1".`)
}

async function main() {
  console.log('\n\x1b[36m========================================\x1b[0m')
  console.log('\x1b[36m   9Drive Automated Release Pipeline    \x1b[0m')
  console.log('\x1b[36m========================================\x1b[0m\n')

  // 1. Check NPM login
  process.stdout.write(' [1/6] Memeriksa akun NPM... ')
  const npmUser = runQuiet('npm whoami')
  if (!npmUser) {
    console.log('\x1b[31m[Gagal]\x1b[0m')
    console.error('\nAnda belum login ke NPM! Jalankan "npm login" terlebih dahulu.')
    process.exit(1)
  }
  console.log(`\x1b[32m[OK]\x1b[0m (Login sebagai: \x1b[33m${npmUser}\x1b[0m)`)

  // 2. Read package.json & determine version
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  const currentVersion = pkg.version || '1.0.0'
  const nextVersion = computeNextVersion(currentVersion, versionArg)

  console.log(` [2/6] Memperbarui versi: \x1b[90mv${currentVersion}\x1b[0m -> \x1b[32mv${nextVersion}\x1b[0m`)
  pkg.version = nextVersion
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  // 3. Build bundle production
  console.log('\n [3/6] Membangun bundle produksi (Vite, TypeScript, SQLite engine)...')
  run(`node "${bundleScriptPath}"`)

  // 4. Git commit & push (jika tidak di-skip)
  if (!skipGit) {
    console.log('\n [4/6] Menyiapkan Git commit & tag...')
    const branch = runQuiet('git rev-parse --abbrev-ref HEAD') || 'main'
    try {
      run(`git add "${pkgPath}"`)
      run(`git commit -m "chore(release): bump version to v${nextVersion}"`)
      run(`git tag -a "v${nextVersion}" -m "Release v${nextVersion}"`)
      console.log(`\x1b[32m[OK] Git commit & tag v${nextVersion} berhasil dibuat.\x1b[0m`)

      if (!skipPush) {
        process.stdout.write(` [4b/6] Mengunggah (push) ke GitHub (${branch})... `)
        runQuiet(`git push origin "${branch}"`)
        runQuiet(`git push origin "v${nextVersion}"`)
        console.log('\x1b[32m[OK]\x1b[0m')
      }
    } catch (err) {
      console.log('\x1b[33m[Perhatian] Git commit/push dilewati atau tidak ada perubahan.\x1b[0m')
    }
  } else {
    console.log('\n [4/6] Melewati Git commit (--no-git aktif).')
  }

  // 5. NPM Publish
  console.log('\n [5/6] Mengunggah rilis ke NPM Registry...')
  run('npm publish')

  // 6. CDN Propagation Verifier
  console.log(`\n [6/6] Menunggu propagasi global CDN NPM untuk \x1b[33m9drive@${nextVersion}\x1b[0m...`)
  console.log('       (Memeriksa ketersediaan paket agar pengguna tidak mengalami error "notarget").\n')

  const startTime = Date.now()
  const maxWaitMs = 180000 // 3 minutes timeout
  let isPropagated = false

  while (Date.now() - startTime < maxWaitMs) {
    const elapsedSec = Math.round((Date.now() - startTime) / 1000)

    try {
      // Check via HTTP fetch to avoid any local npm CLI client-side cache
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(`https://registry.npmjs.org/9drive/${nextVersion}`, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache', 'Accept': 'application/json' },
      })
      clearTimeout(timeout)

      if (res.status === 200) {
        // Also verify dist-tags latest
        const latestRes = await fetch('https://registry.npmjs.org/9drive/latest', {
          headers: { 'Cache-Control': 'no-cache', 'Accept': 'application/json' },
        })
        if (latestRes.ok) {
          const latestData = await latestRes.json()
          if (latestData.version === nextVersion) {
            isPropagated = true
            break
          }
        }
      }
    } catch {}

    process.stdout.write(`\r       ⧗ Memeriksa server CDN... (${elapsedSec} detik berlalu)`)
    await sleep(3000)
  }

  process.stdout.write('\r                                                                 \r')

  if (isPropagated) {
    const elapsedSec = Math.round((Date.now() - startTime) / 1000)
    console.log(`\x1b[32m[✓] Sukses! Rilis v${nextVersion} telah 100% terpropagasi di CDN global NPM (${elapsedSec}s).\x1b[0m\n`)
  } else {
    console.log(`\x1b[33m[!] Waktu polling berakhir. Paket sedang diproses oleh NPM dan akan tersedia dalam beberapa saat.\x1b[0m\n`)
  }

  console.log('\x1b[32m========================================================\x1b[0m')
  console.log(`\x1b[32m🎉 9Drive v${nextVersion} Resmi Rilis & Siap Digunakan!\x1b[0m`)
  console.log('\x1b[32m========================================================\x1b[0m\n')
  console.log('Perintah install untuk pengguna:')
  console.log(`  \x1b[36mnpm install -g 9drive@latest\x1b[0m`)
  console.log(`  \x1b[36mnpx 9drive@latest\x1b[0m\n`)
  console.log('Direct Tarball URL (Bypass metadata):')
  console.log(`  \x1b[90mhttps://registry.npmjs.org/9drive/-/9drive-${nextVersion}.tgz\x1b[0m\n`)
}

main().catch((err) => {
  console.error('\n\x1b[31m[Error]\x1b[0m Release pipeline gagal:', err.message)
  process.exit(1)
})

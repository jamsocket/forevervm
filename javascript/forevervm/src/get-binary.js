import * as fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

function getSuffix(osType, osArch) {
  if (osType === 'win32' && osArch === 'x64') return 'win-x64.exe.gz'
  if (osType === 'linux' && osArch === 'x64') return 'linux-x64.gz'
  if (osType === 'linux' && osArch === 'arm64') return 'linux-arm64.gz'
  if (osType === 'darwin' && osArch === 'x64') return 'macos-x64.gz'
  if (osType === 'darwin' && osArch === 'arm64') return 'macos-arm64.gz'

  throw new Error(`Unsupported platform: ${osType} ${osArch}`)
}

function binaryUrl(version, osType, osArch) {
  const suffix = getSuffix(osType, osArch)

  const url = `https://github.com/jamsocket/forevervm/releases/download/v${version}/forevervm-${suffix}`
  return url
}

async function downloadFile(url, filePath) {
  const zlib = await import('node:zlib')
  const { pipeline } = await import('node:stream/promises')
  const res = await fetch(url)

  if (res.status === 404) {
    throw new Error(
      `Tried to download ${url} but the file was not found. It may have been removed.`,
    )
  } else if (res.status !== 200) {
    throw new Error(`Error downloading ${url}: server returned ${res.status}`)
  }

  await pipeline(res.body, zlib.createGunzip(), fs.createWriteStream(filePath, { mode: 0o770 }))

  return filePath
}

export async function getBinary() {
  let bindir = path.normalize(path.join(os.homedir(), '.config', 'forevervm'))
  await fs.mkdir(bindir, { recursive: true })

  let binpath = path.join(bindir, 'forevervm')

  try {
    await fs.stat(binpath)
    return binpath
  } catch {}

  let pkg = await fs.readFile(path.join(import.meta.dirname, '../package.json'))
  let { version } = JSON.parse(pkg.toString())
  console.log(version)

  let url = binaryUrl(version, process.platform, process.arch)
  await downloadFile(url, binpath)

  return binpath
}

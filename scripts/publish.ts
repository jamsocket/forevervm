import * as cp from 'node:child_process'
import path from 'node:path'
import readline from 'node:readline/promises'
import * as fs from 'node:fs'
import { fileURLToPath } from 'url'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
let abort = new AbortController()

function question(query: string) {
  abort = new AbortController()
  return rl.question(query, { signal: abort.signal })
}

rl.on('SIGINT', () => {
  abort.abort()
  process.exit()
})

function exec(command: string, options?: cp.ExecOptions & { log?: boolean }) {
  return new Promise<string>((resolve, reject) => {
    cp.exec(command, options, (err, stdout, stderr) => {
      if (options?.log !== false && stderr) console.log(stderr)

      if (err) reject(err)
      else resolve(stdout.toString())
    })
  })
}

function getVersion() {
  const currentScriptPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'javascript',
    'forevervm',
    'package.json',
  )
  const json = JSON.parse(fs.readFileSync(currentScriptPath, 'utf-8'))
  return json.version
}

async function verifyBinariesExist(version: string) {
  const files = [
    'win-x64.exe.gz',
    'linux-x64.gz',
    'linux-arm64.gz',
    'macos-x64.gz',
    'macos-arm64.gz',
  ]

  for (const file of files) {
    const url = `https://github.com/jamsocket/forevervm/releases/download/v${version}/forevervm-${file}`

    // send a HEAD request to check if the file exists
    const res = await fetch(url, { method: 'HEAD' })

    if (res.status !== 200) {
      console.error(`Binary for ${file} does not exist! Got status ${res.status}`)
      process.exit(1)
    } else {
      console.log(`Binary for ${file} exists!`)
    }
  }
}

async function main() {
  const version = getVersion()
  await verifyBinariesExist(version)

  const branch = await exec('git branch --show-current')
  if (branch.trim() !== 'main') {
    console.error('Must publish from main branch!')
    process.exit(1)
  }

  await exec('git fetch')
  const commits = await exec('git rev-list HEAD...origin/main --count')
  if (commits.trim() !== '0') {
    console.error('main branch must be up to date!')
    process.exit(1)
  }

  const changes = await exec('git diff --quiet')
    .then(() => false)
    .catch(() => true)
  if (changes) {
    console.error('Cannot publish with local changes!')
    process.exit(1)
  }

  console.log(`Publishing to crates.io…`)
  await publishToCrates()
  console.log(`Published packages to crates.io!`)

  console.log(`Publishing to npm…`)
  await publishToNpm()
  console.log(`Published packages to npm!`)

  console.log(`Publishing to PyPI…`)
  await publishToPyPI()
  console.log(`Published packages to PyPI!`)
}

async function publishToCrates() {
  const cwd = path.resolve('../rust')
  await exec('cargo install cargo-workspaces', { cwd })
  await exec('cargo workspaces publish --from-git', { cwd })
}

async function publishToNpm() {
  let otp = ''
  for (const pkg of ['forevervm', 'sdk', 'mcp-server']) {
    const cwd = path.resolve('../javascript', pkg)

    const json = await import(path.resolve(cwd, 'package.json'), { with: { type: 'json' } })
    const version = await exec(`npm view ${json.name} version`)
    if (json.version === version.trim()) {
      console.log(`Already published ${json.name} ${json.version}`)
      continue
    }

    let published = false
    while (!published) {
      try {
        let cmd = 'npm publish'
        if (otp) cmd += ' --otp=' + otp
        await exec(cmd, { log: false, cwd })
        published = true
      } catch (e) {
        if (!/npm error code EOTP/.test(e as string)) throw e

        otp = await question('Enter your npm OTP: ')
        if (!otp) throw e
      }
    }
  }
}

async function publishToPyPI() {
  const token = await question('Enter your PyPI token: ')

  for (const pkg of ['forevervm', 'sdk']) {
    const cwd = path.resolve('../python', pkg)
    await exec('rm -rf dist', { cwd })
    await exec('uv build', { cwd })
    await exec('uv publish --token ' + token, { cwd })
  }
}

try {
  await main()
} finally {
  rl.close()
}

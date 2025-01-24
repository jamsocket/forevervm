import * as fs from 'fs'
import * as path from 'path'
import * as TOML from '@iarna/toml'
import { Command } from 'commander'
import chalk from 'chalk'

class SemverVersion {
  constructor(
    public major: number,
    public minor: number,
    public patch: number,
  ) {}

  static parse(version: string): SemverVersion {
    const [major, minor, patch] = version.split('.')
    return new SemverVersion(parseInt(major), parseInt(minor), parseInt(patch))
  }

  toString() {
    return `${this.major}.${this.minor}.${this.patch}`
  }

  bump(type: 'major' | 'minor' | 'patch') {
    switch (type) {
      case 'major':
        return new SemverVersion(this.major + 1, 0, 0)
      case 'minor':
        return new SemverVersion(this.major, this.minor + 1, 0)
      case 'patch':
        return new SemverVersion(this.major, this.minor, this.patch + 1)
      default:
        throw new Error(`Invalid version bump type: ${type}`)
    }
  }

  equals(other?: SemverVersion | null) {
    if (other === null || other === undefined) return false
    return this.major === other.major && this.minor === other.minor && this.patch === other.patch
  }

  cmp(other: SemverVersion) {
    if (this.major < other.major) return -1
    if (this.major > other.major) return 1
    if (this.minor < other.minor) return -1
    if (this.minor > other.minor) return 1
    if (this.patch < other.patch) return -1
    if (this.patch > other.patch) return 1
    return 0
  }
}

interface Package {
  repo: PackageRepo
  path: string
  name: string
  currentVersion?: SemverVersion
  publishedVersion?: SemverVersion | null
  private: boolean
}

interface PackageRepo {
  repoName: string

  gatherPackages(): Package[]

  getDeployedVersion(name: string): Promise<SemverVersion | null>

  updateVersion(path: string, version: SemverVersion): void
}

class NpmPackageRepo implements PackageRepo {
  repoName = 'npm'

  gatherPackages(): Package[] {
    const scriptDir = __dirname
    const jsDir = path.join(scriptDir, '..', 'javascript')
    const packages: Package[] = []

    const crawlDir = (dir: string) => {
      const items = fs.readdirSync(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
          crawlDir(fullPath)
        } else if (item === 'package.json') {
          const content = fs.readFileSync(fullPath, 'utf-8')
          const pkg = JSON.parse(content)
          packages.push({
            repo: this,
            path: fullPath,
            name: pkg.name,
            currentVersion: pkg.version && SemverVersion.parse(pkg.version),
            private: pkg.private || false,
          })
        }
      }
    }

    crawlDir(jsDir)
    return packages
  }

  async getDeployedVersion(name: string): Promise<SemverVersion | null> {
    try {
      const response = await fetch(`https://registry.npmjs.org/${name}`)
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch package info: ${response.statusText}`)
      }
      const data = (await response.json()) as any
      const version = data['dist-tags']?.latest
      return version ? SemverVersion.parse(version) : null
    } catch (error) {
      console.error(`Error fetching version for ${name}:`, error)
      return null
    }
  }

  updateVersion(path: string, version: SemverVersion): void {
    const content = fs.readFileSync(path, 'utf-8')
    const pkg = JSON.parse(content)
    pkg.version = version.toString()
    fs.writeFileSync(path, JSON.stringify(pkg, null, 2))
  }
}

class PythonPackageRepo implements PackageRepo {
  repoName = 'python'

  gatherPackages(): Package[] {
    const scriptDir = __dirname
    const pythonDir = path.join(scriptDir, '..', 'python')
    const packages: Package[] = []

    const crawlDir = (dir: string) => {
      const items = fs.readdirSync(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
          crawlDir(fullPath)
        } else if (item === 'pyproject.toml') {
          const content = fs.readFileSync(fullPath, 'utf-8')
          const parsed = TOML.parse(content)
          const projectData = parsed.project as any

          if (projectData?.name && projectData?.version) {
            packages.push({
              repo: this,
              path: fullPath,
              name: projectData.name,
              currentVersion: projectData.version && SemverVersion.parse(projectData.version),
              private: false, // Note: implement this if we need private packages
            })
          }
        }
      }
    }

    crawlDir(pythonDir)
    return packages
  }

  async getDeployedVersion(name: string): Promise<SemverVersion | null> {
    try {
      const response = await fetch(`https://pypi.org/pypi/${name}/json`)
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch package info: ${response.statusText}`)
      }
      const data = (await response.json()) as any
      const version = data.info?.version
      return version ? SemverVersion.parse(version) : null
    } catch (error) {
      console.error(`Error fetching version for ${name}:`, error)
      return null
    }
  }

  updateVersion(path: string, version: SemverVersion): void {
    const content = fs.readFileSync(path, 'utf-8')
    const newContent = content.replace(/version\s*=\s*"[^"]*"/, `version = "${version}"`)
    if (content === newContent) {
      throw new Error(`Failed to update version in ${path}`)
    }
    fs.writeFileSync(path, newContent)
  }
}

class CargoPackageRepo implements PackageRepo {
  repoName = 'cargo'

  gatherPackages(): Package[] {
    const cargoDir = path.join(__dirname, '..', 'rust')
    const packages: Package[] = []

    const crawlDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.name === 'target') {
          continue
        }

        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          crawlDir(fullPath)
        } else if (entry.name === 'Cargo.toml') {
          const content = fs.readFileSync(fullPath, 'utf-8')
          const data = TOML.parse(content) as any

          if (data.package && data.package.name && data.package.version) {
            packages.push({
              repo: this,
              path: fullPath,
              name: data.package.name,
              currentVersion: data.package.version && SemverVersion.parse(data.package.version),
              private: false, // Cargo packages are typically public
            })
          }
        }
      }
    }

    crawlDir(cargoDir)
    return packages
  }

  async getDeployedVersion(name: string): Promise<SemverVersion | null> {
    try {
      const response = await fetch(`https://crates.io/api/v1/crates/${name}`, {
        headers: {
          // crates.io requires a non-default user agent.
          'User-Agent': 'forevervm bump-versions script',
        },
      })
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch package info: ${response.statusText}`)
      }
      const data = (await response.json()) as any
      const version = data.crate?.max_version
      return version ? SemverVersion.parse(version) : null
    } catch (error) {
      console.error(`Error fetching version for ${name}:`, error)
      return null
    }
  }

  updateVersion(path: string, version: SemverVersion): void {
    const content = fs.readFileSync(path, 'utf-8')
    const newContent = content.replace(/version\s*=\s*"[^"]*"/, `version = "${version}"`)
    if (content === newContent) {
      throw new Error(`Failed to update version in ${path}`)
    }
    fs.writeFileSync(path, newContent)
  }
}

function collectPackages(): Package[] {
  const packages: Package[] = []

  packages.push(...new NpmPackageRepo().gatherPackages())
  packages.push(...new PythonPackageRepo().gatherPackages())
  packages.push(...new CargoPackageRepo().gatherPackages())

  return packages
}

async function getCurrentVersions(packages: Package[]): Promise<Package[]> {
  // filter out private packages
  const filteredPackages = packages.filter((pkg) => !pkg.private)
  const publishedVersions = await Promise.all(
    filteredPackages.map(async (pkg) => {
      const publishedVersion = await pkg.repo.getDeployedVersion(pkg.name)
      return { ...pkg, publishedVersion }
    }),
  )
  return publishedVersions
}

async function main() {
  const program = new Command()

  program.name('bump-versions').description('CLI to manage package versions')

  program
    .command('info')
    .description('List all packages and their versions')
    .action(async () => {
      const packages = await getCurrentVersions(collectPackages())

      for (const pkg of packages) {
        const same = pkg.currentVersion?.equals(pkg.publishedVersion)

        if (same) {
          console.log(
            `${chalk.cyan(pkg.repo.repoName)} ${chalk.yellow(pkg.name)}: local ${chalk.green(pkg.currentVersion)} == published ${chalk.green(pkg.publishedVersion)}`,
          )
        } else {
          console.log(
            `${chalk.cyan(pkg.repo.repoName)} ${chalk.yellow(pkg.name)}: local ${chalk.green(pkg.currentVersion)} != published ${chalk.red(pkg.publishedVersion || 'N/A')}`,
          )
        }
      }
    })

  program
    .command('bump [type]')
    .description('Bump all packages versions')
    .argument('[type]', 'Type of version bump', 'patch')
    .option('-d, --dry-run', 'Perform a dry run without making changes')
    .action(async (type: 'major' | 'minor' | 'patch', _, options: { dryRun: boolean }) => {
      if (type !== 'major' && type !== 'minor' && type !== 'patch') {
        console.error('Invalid version type; must be one of "major", "minor", or "patch"')
        process.exit(1)
      }

      const dryRun = options.dryRun

      const packages = await getCurrentVersions(collectPackages())

      const validVersions = packages
        .map((pkg) => pkg.currentVersion)
        .filter((v) => v !== null && v !== undefined)
      const maxLocalVersion = validVersions.reduce((a, b) => (a.cmp(b) > 0 ? a : b))

      const maxPublishedVersion = packages
        .map((pkg) => pkg.publishedVersion)
        .filter((v) => v !== null && v !== undefined)
        .reduce((a, b) => (a!.cmp(b!) > 0 ? a : b))

      const maxVersion =
        maxLocalVersion!.cmp(maxPublishedVersion!) > 0 ? maxLocalVersion : maxPublishedVersion

      const bumpedVersion = maxVersion!.bump(type)

      const plan = []

      for (const pkg of packages) {
        if (pkg.currentVersion !== bumpedVersion) {
          plan.push({
            package: pkg,
            from: pkg.currentVersion,
            to: bumpedVersion,
          })
        }
      }

      for (const item of plan) {
        console.log('Plan:')
        console.log(
          `${chalk.blue(item.package.repo.repoName)} ${chalk.cyan(item.package.name)}: ${chalk.red(item.from)} ${chalk.gray('->')} ${chalk.green(item.to)}`,
        )
      }

      if (dryRun) {
        console.log('Dry run; no changes will be made.')
      } else {
        for (const item of plan) {
          console.log(
            `Updating ${chalk.blue(item.package.repo.repoName)} ${chalk.cyan(item.package.name)}: ${chalk.red(item.from)} ${chalk.gray('->')} ${chalk.green(item.to)}`,
          )
          item.package.repo.updateVersion(item.package.path, item.to)
        }
      }
    })

  program.parse()
}

main()

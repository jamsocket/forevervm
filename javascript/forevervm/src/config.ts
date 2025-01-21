import * as path from 'path'
import * as fs from 'fs'
import { ForeverVM } from '@forevervm/sdk'

export interface CliConfig {
  token: string
}

export class ConfigManager {
  constructor(private configDir: string) {}

  getConfigPath(): string {
    fs.mkdirSync(this.configDir, { recursive: true })
    return path.join(this.configDir, 'config.json')
  }

  saveConfig(config: CliConfig): void {
    const configPath = this.getConfigPath()
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
    fs.chmodSync(configPath, 0o600)
  }

  loadConfig(): CliConfig | null {
    try {
      const configPath = this.getConfigPath()
      const configData = fs.readFileSync(configPath, 'utf-8')
      return JSON.parse(configData) as CliConfig
    } catch (error) {
      return null
    }
  }
}

export const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8080'

export function getSDKFromEnv(configDir: string): ForeverVM {
  const configManager = new ConfigManager(configDir)
  const config = configManager.loadConfig()

  if (!config || !config.token) {
    throw new Error('Use "forevervm login" to login first.')
  }

  return new ForeverVM(config.token, { baseUrl: API_BASE_URL })
}

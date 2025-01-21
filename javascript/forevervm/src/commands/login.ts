import { Command } from '@oclif/core'
import { password } from '@inquirer/prompts'
import { ForeverVM } from '@forevervm/sdk'
import { API_BASE_URL, ConfigManager } from '../config.js'
import chalk from 'chalk'

export default class Login extends Command {
  static override description = 'Login with your token'

  static override examples = ['<%= config.bin %> login']

  private configManager: ConfigManager

  constructor(argv: string[], config: any) {
    super(argv, config)
    this.configManager = new ConfigManager(this.config.configDir)
  }

  public async run(): Promise<void> {
    // first, see if we are already logged in
    const config = await this.configManager.loadConfig()
    if (config) {
      let token = config.token

      const sdk = new ForeverVM(token, { baseUrl: API_BASE_URL })
      let account = await sdk.whoami()

      this.log(
        `Already logged in as ${chalk.green(account.account)}. Use logout to log out first if you would like to change accounts.`,
      )
      return
    }

    const token = await password({
      message: 'Enter your token:',
      mask: '*',
    })

    const sdk = new ForeverVM(token, { baseUrl: API_BASE_URL })
    let account = await sdk.whoami()

    await this.configManager.saveConfig({ token })
    this.log(`Successfully logged in as ${chalk.green(account.account)}`)
  }
}

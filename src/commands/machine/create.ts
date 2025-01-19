import { Command, Flags } from '@oclif/core'
import { getClientFromEnv } from '../../config.js'
import chalk from 'chalk'

export default class MachineCreate extends Command {
  static override description = 'Create a new machine and get its ID'

  static override examples = ['<%= config.bin %> <%= command.id %>']

  public async run(): Promise<void> {
    const client = getClientFromEnv(this.config.configDir)

    const response = await client.createMachine()
    this.log(`Created machine: ${chalk.green(response.machine_name)}`)
  }
}

import { Command } from '@oclif/core'
import { getSDKFromEnv } from '../../config.js'
import cj from 'color-json'

export default class MachineList extends Command {
  static override description = 'List machines in reverse-chronological order of creation.'

  static override examples = ['<%= config.bin %> <%= command.id %>']

  public async run(): Promise<void> {
    const sdk = getSDKFromEnv(this.config.configDir)

    const machines = await sdk.listMachines()
    this.log(cj(machines))
  }
}

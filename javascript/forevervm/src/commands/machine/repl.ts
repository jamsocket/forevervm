import { input } from '@inquirer/prompts'
import { Args, Command } from '@oclif/core'
import chalk from 'chalk'

import { getSDKFromEnv } from '../../config.js'

export default class MachineRepl extends Command {
  static aliases = ['repl']

  static override args = {
    machine: Args.string({ description: 'machine to connect to' }),
  }

  static override description = 'connect to a machine and start a REPL'

  static override examples = ['<%= config.bin %> <%= command.id %>']

  public async run(): Promise<void> {
    const { args } = await this.parse(MachineRepl)
    const sdk = getSDKFromEnv(this.config.configDir)

    const repl = await sdk.repl(args.machine)

    if (args.machine) {
      this.log(`Connected to ${chalk.green(args.machine)}!`)
    } else {
      this.log('Connected to new machine!')
    }

    while (true) {
      const code = await input({
        message: '>>> ',
      })

      if (code.trim() === '') {
        continue
      }

      const execResult = repl.exec(code)

      for await (const log of execResult.output) {
        this.log(chalk.redBright(log.stream), chalk.yellowBright(log.data))
      }

      const result = await execResult.result
      if (result.value !== undefined) {
        this.log(`${chalk.magenta(result.value)}`)
      } else if (result.error !== undefined) {
        this.log(`${chalk.red(result.error)}`)
      } else {
        this.log(`${chalk.red(result)}`)
      }
    }
  }
}

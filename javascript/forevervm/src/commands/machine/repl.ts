import { input } from '@inquirer/prompts'
import { Args, Command } from '@oclif/core'
import chalk from 'chalk'

import { getSDKFromEnv } from '../../config.js'

export default class MachineRepl extends Command {
  static override args = {
    machine: Args.string({ description: 'machine to connect to', required: true }),
  }

  static override description = 'connect to a machine and start a REPL'

  static override examples = ['<%= config.bin %> <%= command.id %>']

  public async run(): Promise<void> {
    const { args } = await this.parse(MachineRepl)
    const sdk = getSDKFromEnv(this.config.configDir)

    const repl = await sdk.repl(args.machine)
    this.log(`Connected to ${chalk.green(args.machine)}!`)

    while (true) {
      const code = await input({
        message: '>>> ',
      })

      if (code.trim() === '') {
        continue
      }

      const execResult = await repl.exec(code)

      while (true) {
        let output = await execResult.nextOutput()
        if (output === null) break
        this.log(chalk.redBright(output.stream), chalk.yellowBright(output.data))
      }

      const result = await execResult.result()
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

import { Args, Command, Flags } from '@oclif/core'
import { getClientFromEnv } from '../../config.js'
import chalk from 'chalk'
import { input } from '@inquirer/prompts'

export default class MachineRepl extends Command {
  static override args = {
    machine: Args.string({ description: 'machine to connect to', required: true }),
  }

  static override description = 'connect to a machine and start a REPL'

  static override examples = ['<%= config.bin %> <%= command.id %>']

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(MachineRepl)
    const client = getClientFromEnv(this.config.configDir)

    const repl = await client.repl(args.machine)
    this.log(`Connected to ${chalk.green(args.machine)}!`)

    while (true) {
      const code = await input({
        message: '>>> ',
      })

      if (code === '') {
        this.log('Goodbye!')
        return
      }

      const execResult = await repl.exec({ code })

      while (true) {
        let output = await execResult.nextOutput()
        if (output === undefined) break
        this.log(`  ${output}`)
      }

      const result = await execResult.result()
      if (result.result.value !== undefined) {
        this.log(`${chalk.magenta(result.result.value)}`)
      } else if (result.result.error !== undefined) {
        this.log(`${chalk.red(result.result.error)}`)
      } else {
        this.log(`${chalk.red(result)}`)
      }
    }
  }
}

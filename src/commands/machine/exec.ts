import { Args, Command, Flags } from '@oclif/core'
import { getClientFromEnv } from '../../config.js'
import cj from 'color-json'
import chalk from 'chalk'

export default class MachineExec extends Command {
  static override args = {
    machine: Args.string({ description: 'machine to execute on', required: true }),
    code: Args.string({ description: 'code to execute', required: true }),
  }

  static override description =
    'Evaluate a Python expression or statement on a machine and wait for the result.'

  static override examples = ['<%= config.bin %> <%= command.id %> "1 + 1"']

  static override flags = {
    noWait: Flags.boolean({ char: 'w', description: 'do not wait for the result' }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(MachineExec)

    const client = getClientFromEnv(this.config.configDir)

    const response = await client.execMachine(args.code, args.machine, flags.noWait)
    if (response.instruction_seq === undefined) {
      this.log(
        'The instruction was not submitted because another instruction is already running or pending.',
      )
      return
    }

    this.log(
      `Submitted instruction (sequence ${chalk.green(response.instruction_seq)} on machine ${chalk.green(args.machine)})`,
    )

    if (!flags.noWait) {
      const result = await client.execResult(args.machine, response.instruction_seq)
      if (result.result.value !== undefined) {
        this.log(`Result: ${chalk.magenta(result.result.value)}`)
      } else {
        this.log(`Result: ${chalk.red(result.result.error)}`)
      }
    }
  }
}

import { getForeverVMOptions } from '../index.js'
import { installForClaude } from './claude.js'
import { installForGoose } from './goose.js'
import { installForWindsurf } from './windsurf.js'

export function installForeverVM(options: { claude: boolean; windsurf: boolean; goose: boolean }) {
  const forevervmOptions = getForeverVMOptions()

  if (!forevervmOptions?.token) {
    console.error(
      'ForeverVM token not found. Please set up ForeverVM first by running `npx forevervm login` or `npx forevervm signup`.',
    )
    process.exit(1)
  }

  if (!options.claude && !options.windsurf && !options.goose) {
    console.log(
      'Select at least one MCP client to install. Available options: --claude, --windsurf, --goose',
    )
    process.exit(1)
  }

  if (options.claude) {
    installForClaude()
  }

  if (options.goose) {
    installForGoose()
  }

  if (options.windsurf) {
    installForWindsurf()
  }
}

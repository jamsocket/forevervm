import path from 'path'
import os from 'os'
import fs from 'fs'

function getWindsurfConfigFilePath(): string {
  // Ref: https://docs.codeium.com/windsurf/mcp
  const homeDir = os.homedir()

  if (process.platform === 'win32') {
    // NOTE: the official docs don't say where to put the file on Windows, so currently we don't support that.
    console.error(
      'Automatic installation is not supported on Windows, follow the instructions here instead: https://docs.codeium.com/windsurf/mcp',
    )
    process.exit(1)
  }

  return path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json')
}

export function installForWindsurf() {
  const configFilePath = getWindsurfConfigFilePath()

  // Ensure the parent directory exists
  const configDir = path.dirname(configFilePath)
  if (!fs.existsSync(configDir)) {
    console.error(
      `Windsurf config directory does not exist (tried ${configDir}). Unable to install ForeverVM for Windsurf.`,
    )
    process.exit(1)
  }

  let config: any = {}

  // If the file exists, read and parse the existing config
  if (fs.existsSync(configFilePath)) {
    try {
      const fileContent = fs.readFileSync(configFilePath, 'utf8')
      config = JSON.parse(fileContent)
    } catch (error) {
      console.error('Failed to read or parse existing Windsurf config:', error)
      process.exit(1)
    }
  }

  config.mcpServers = config.mcpServers || {}

  config.mcpServers.forevervm = {
    command: 'npx',
    args: ['--yes', 'forevervm-mcp', 'run'],
  }

  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2) + '\n', 'utf8')
    console.log(`✅ Windsurf configuration updated successfully at: ${configFilePath}`)
  } catch (error) {
    console.error('❌ Failed to write to Windsurf config file:', error)
    process.exit(1)
  }
}

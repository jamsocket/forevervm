import path from 'path'
import os from 'os'
import fs from 'fs'

function getClaudeConfigFilePath(): string {
  const homeDir = os.homedir()

  if (process.platform === 'win32') {
    // Windows path
    return path.join(
      process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'),
      'Claude',
      'claude_desktop_config.json',
    )
  } else {
    // macOS & Linux path
    return path.join(
      homeDir,
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json',
    )
  }
}

export function installForClaude() {
  const configFilePath = getClaudeConfigFilePath()

  // Ensure the parent directory exists
  const configDir = path.dirname(configFilePath)
  if (!fs.existsSync(configDir)) {
    console.error(
      `Claude config directory does not exist (tried ${configDir}). Unable to install ForeverVM for Claude Desktop.`,
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
      console.error('Failed to read or parse existing Claude config:', error)
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
    console.log(`✅ Claude Desktop configuration updated successfully at: ${configFilePath}`)
  } catch (error) {
    console.error('❌ Failed to write to Claude Desktop config file:', error)
    process.exit(1)
  }
}

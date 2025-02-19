import path from 'path'
import os from 'os'
import fs from 'fs'
import YAML from 'yaml'

function getGooseConfigFilePath(): string {
  // Goose calls MCP servers "extensions"
  // Ref: https://block.github.io/goose/docs/getting-started/using-extensions
  // Currently, only CLI Goose uses file-based configuration; desktop Goose uses
  // Electron Local Storage. This is actively in transition
  // Ref: https://github.com/block/goose/discussions/890#discussioncomment-12093422
  const homeDir = os.homedir()

  return path.join(homeDir, '.config', 'goose', 'config.yaml')
}

export function installForGoose() {
  const configFilePath = getGooseConfigFilePath()

  // Ensure the parent directory exists
  const configDir = path.dirname(configFilePath)
  if (!fs.existsSync(configDir)) {
    console.error(
      `Goose config directory does not exist (tried ${configDir}). Unable to install ForeverVM for Goose.`,
    )
    process.exit(1)
  }

  let config: YAML.Document
  // If the file exists, read and parse the existing config
  if (fs.existsSync(configFilePath)) {
    try {
      const fileContent = fs.readFileSync(configFilePath, 'utf8')
      config = YAML.parseDocument(fileContent)
    } catch (error) {
      console.error('Failed to read or parse existing Goose config:', error)
      process.exit(1)
    }
  } else {
    console.error(`Goose config file not found at: ${configFilePath}`)
    process.exit(1)
  }

  if (!config.has('extensions')) {
    config.set('extensions', {})
  }

  config.setIn(['extensions', 'forevervm'], {
    cmd: 'npx',
    args: ['--yes', 'forevervm-mcp', 'run'],
    enabled: true,
    envs: {},
    name: 'forevervm',
    type: 'stdio',
  })

  try {
    fs.writeFileSync(configFilePath, YAML.stringify(config), 'utf8')
    console.log(`✅ Goose configuration updated successfully at: ${configFilePath}`)
  } catch (error) {
    console.error('❌ Failed to write to Goose config file:', error)
    process.exit(1)
  }
}

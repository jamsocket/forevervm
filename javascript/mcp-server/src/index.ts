#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { ForeverVM } from '@forevervm/sdk'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { Command } from 'commander'

// Install ForeverVM
// For Claude Desktop, this function adds ForeverVM to the claude_desktop_config.json file
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

async function installForeverVM(options: { claude: boolean }) {
  let forevervmToken = getForeverVMToken()

  if (!forevervmToken) {
    console.error('ForeverVM token not found. Please set up ForeverVM first.')
    throw new Error('ForeverVM token not found. Please set up ForeverVM first.')
  }

  if (options.claude) {
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
      args: ['forevervm-mcp', 'run'],
      env: {
        FOREVERVM_TOKEN: forevervmToken,
      },
    }

    try {
      fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf8')
      console.log(`✅ Claude Desktop configuration updated successfully at: ${configFilePath}`)
    } catch (error) {
      console.error('❌ Failed to write to Claude Desktop config file:', error)
      process.exit(1)
    }
  } else {
    console.log('MCP client not selected. Use --claude to install for Claude Desktop.')
    process.exit(1)
  }
}

// Zod schema
const ExecMachineSchema = z.object({
  pythonCode: z.string(),
  replId: z.string(),
})

const RUN_REPL_TOOL_NAME = 'run-python-in-repl'
const CREATE_REPL_MACHINE_TOOL_NAME = 'create-python-repl'

function getForeverVMToken(): string | null {
  if (process.env.FOREVERVM_TOKEN) {
    return process.env.FOREVERVM_TOKEN
  }

  const configFilePath = path.join(os.homedir(), '.config', 'forevervm', 'config.json')

  if (!fs.existsSync(configFilePath)) {
    console.error('ForeverVM config file not found at:', configFilePath)
    process.exit(1)
  }

  try {
    const fileContent = fs.readFileSync(configFilePath, 'utf8')
    const config = JSON.parse(fileContent)

    if (!config.token) {
      console.error('ForeverVM config file does not contain a token')
      process.exit(1)
    }
    return config.token
  } catch (error) {
    console.error('Failed to read ForeverVM config file:', error)
    process.exit(1)
  }
}

// ForeverVM integration
interface ExecReplResponse {
  output: string
  result: string
  replId: string
  error?: string
  image?: string
}
async function makeExecReplRequest(
  forevervmToken: string,
  pythonCode: string,
  replId: string,
): Promise<ExecReplResponse> {
  try {
    const fvm = new ForeverVM({ token: forevervmToken })

    const repl = await fvm.repl(replId)

    const execResult = await repl.exec(pythonCode, { timeoutSeconds: 5 })

    const output: string[] = []
    for await (const nextOutput of execResult.output) {
      output.push(nextOutput.data)
    }

    const result = await execResult.result
    const imageResult = result.data?.['png'] as string | undefined

    if (typeof result.value === 'string') {
      return {
        output: output.join('\n'),
        result: result.value,
        replId: replId,
        image: imageResult,
      }
    } else if (result.value === null) {
      return {
        output: output.join('\n'),
        result: 'The code did not return a value',
        replId: replId,
        image: imageResult,
      }
    } else if (result.error) {
      return {
        output: output.join('\n'),
        result: '',
        replId: replId,
        error: `Error: ${result.error}`,
        image: imageResult,
      }
    } else {
      return {
        output: output.join('\n'),
        result: 'No result or error returned',
        replId: replId,
        image: imageResult,
      }
    }
  } catch (error: any) {
    console.error(`Failed to execute code on the ForeverVM REPL: ${error} \n\nreplId: ${replId}`)
    process.exit(1)
  }
}

async function makeCreateMachineRequest(forevervmToken: string): Promise<string> {
  try {
    const fvm = new ForeverVM({ token: forevervmToken })

    const machine = await fvm.createMachine()

    return machine.machine_name
  } catch (error: any) {
    console.error(`Failed to create ForeverVM machine: ${error}`)
    process.exit(1)
  }
}

// Start server
async function runMCPServer() {
  let forevervmToken = getForeverVMToken()

  if (!forevervmToken) {
    console.error('ForeverVM token not found. Please set up ForeverVM first.')
    process.exit(1)
  }

  const server = new Server(
    { name: 'forevervm', version: '1.0.0' },
    { capabilities: { tools: {} } },
  )

  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: RUN_REPL_TOOL_NAME,
          description:
            'Run Python code in a given REPL. Common libraries including numpy, pandas, and requests are available to be imported. External API requests are allowed.',
          inputSchema: {
            type: 'object',
            properties: {
              pythonCode: {
                type: 'string',
                description: 'Python code to execute in the REPL.',
              },
              replId: {
                type: 'string',
                description:
                  'The ID corresponding with the REPL to run the Python code on. REPLs persist global state across runs. Create a REPL once per session with the create-python-repl tool.',
              },
            },
            required: ['pythonCode', 'replId'],
          },
        },
        {
          name: CREATE_REPL_MACHINE_TOOL_NAME,
          description:
            'Create a Python REPL. Global variables, imports, and function definitions are preserved between runs.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      ],
    }
  })

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      if (name === RUN_REPL_TOOL_NAME) {
        const { pythonCode, replId } = ExecMachineSchema.parse(args)
        const execResponse = await makeExecReplRequest(forevervmToken, pythonCode, replId)

        if (execResponse.error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(execResponse),
                isError: true,
              },
            ],
          }
        }

        if (execResponse.image) {
          return {
            content: [
              {
                type: 'image',
                data: execResponse.image,
                mimeType: 'image/png',
              },
            ],
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(execResponse),
            },
          ],
        }
      } else if (name === CREATE_REPL_MACHINE_TOOL_NAME) {
        const replId = await makeCreateMachineRequest(forevervmToken)
        return {
          content: [
            {
              type: 'text',
              text: replId,
            },
          ],
        }
      } else {
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid arguments: ${error.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', ')}`,
        )
      }
      throw error
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

function main() {
  const program = new Command()

  program.name('forevervm-mcp').version('1.0.0')

  program
    .command('install')
    .description('Set up the ForeverVM MCP server')
    .option('-c, --claude', 'Set up the MCP Server for Claude Desktop')
    .action(installForeverVM)

  program.command('run').description('Run the ForeverVM MCP server').action(runMCPServer)

  if (process.argv.length === 2) {
    program.outputHelp()
    return
  }

  program.parse(process.argv)
}

main()

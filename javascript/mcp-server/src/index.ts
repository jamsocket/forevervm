#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { ForeverVM } from '@forevervm/sdk'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { Command } from "commander";

// install step adds the entire json object for forevervm to the claude desktop file
// we grab the token from the ForeverVM CLI
// if the cli config doesn't have a token then we print a message for forevervm setup first
async function installForeverVM(options: { claude: boolean }) {
  let forevervmToken = getForeverVMToken();

  if(!forevervmToken) {
    throw Error("ForeverVM token not found. Please set up ForeverVM first.");
  }

  if (options.claude) {
    const configFilePath = path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json"
    );

    // Ensure the directory exists
    const configDir = path.dirname(configFilePath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    let config: any = {};

    // If the file exists, read and parse the existing config
    if (fs.existsSync(configFilePath)) {
      try {
        const fileContent = fs.readFileSync(configFilePath, "utf8");
        config = JSON.parse(fileContent);
      } catch (error) {
        console.error("Failed to read or parse existing Claude config:", error);
        return;
      }
    }

    // Ensure the forevervm section is updated
    config.forevervm = {
      command: "npx",
      args: ["forevervm-mcp"],
      env: {
        FOREVERVM_TOKEN: getForeverVMToken(),
      },
    };

    // Write the updated config back to the file
    try {
      fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), "utf8");
      console.log(`Claude Desktop configuration updated successfully at: ${configFilePath}`);
    } catch (error) {
      console.error("Failed to write to Claude Desktop config file:", error);
    }
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
    return null
  }

  try {
    const fileContent = fs.readFileSync(configFilePath, 'utf8')
    const config = JSON.parse(fileContent)

    if (!config.token) {
      console.error('ForeverVM config file does not contain a token')
      return null
    }
    return config.token
  } catch (error) {
    console.error('Failed to read ForeverVM config file:', error)
    return null
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
      output.push(`[${nextOutput.stream}] ${nextOutput.data}`)
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
        result: 'The code returned no output',
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
    throw new Error(`Failed to execute code on the ForeverVM REPL: ${error} \n\nreplId: ${replId}`)
  }
}

async function makeCreateMachineRequest(forevervmToken: string): Promise<string> {
  try {
    const fvm = new ForeverVM({ token: forevervmToken })

    const machine = await fvm.createMachine()

    return machine.machine_name
  } catch (error: any) {
    throw new Error(`Failed to create ForeverVM machine: ${error}`)
  }
}

// Start server
async function runMCPServer() {
  let forevervmToken = getForeverVMToken();

  if(!forevervmToken) {
    throw Error("ForeverVM token not found. Please set up ForeverVM first.");
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

// runMCPServer(forevervmToken).catch((error) => {
//   console.error('Fatal error in main():', error)
//   process.exit(1)
// })

function main() {
  const program = new Command();

  program
    .name("forevervm-mcp") // CLI name
    .version("1.0.0"); // CLI version

  program
    .command("install") // Define a command with an argument
    .description("A CLI to set up the ForeverVM MCP server")
    .option("-c, --claude", "Set up the MCP Server for Claude Desktop") // Add an option
    .action(
      installForeverVM
    );

  program.parse(process.argv);

  runMCPServer().catch((error) => {
    console.error('Fatal error in main():', error)
    process.exit(1)
  })
}

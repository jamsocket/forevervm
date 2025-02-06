#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { ForeverVM } from '@forevervm/sdk'

// Zod schema
const ExecMachineSchema = z.object({
  pythonCode: z.string(),
  replId: z.string(),
})

// Server setup
const server = new Server({ name: 'forevervm', version: '1.0.0' }, { capabilities: { tools: {} } })

const RUN_REPL_TOOL_NAME = 'run-python-in-repl'
const CREATE_REPL_MACHINE_TOOL_NAME = 'create-python-repl'

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

// ForeverVM integration
interface ExecReplResponse {
  output: string
  result: string
  replId: string
  error?: string
  image?: string
}
async function makeExecReplRequest(pythonCode: string, replId: string): Promise<ExecReplResponse> {
  const forevervmToken = process.env.FOREVERVM_TOKEN
  if (!forevervmToken) {
    throw new Error('FOREVERVM_TOKEN is not set')
  }
  try {
    const fvm = new ForeverVM({ token: forevervmToken })

    const repl = await fvm.repl(replId)

    const execResult = await repl.exec(pythonCode, { timeoutSeconds: 5 })

    const output: string[] = []
    for await (const nextOutput of execResult.output) {
      output.push(`[${nextOutput.stream}] ${nextOutput.data}`)
    }

    const result = await execResult.result

    if (typeof result.value === 'string') {
      return {
        output: output.join('\n'),
        result: result.value,
        replId: replId,
        image: result.data?.["png"] as string | undefined,
      }
    } else if (result.value === null) {
      return {
        output: output.join('\n'),
        result: 'The code returned no output',
        replId: replId,
        image: result.data?.["png"] as string | undefined,
      }
    } else if (result.error) {
      return {
        output: output.join('\n'),
        result: '',
        replId: replId,
        error: `Error: ${result.error}`,
        image: result.data?.["png"] as string | undefined,
      }
    } else {
      return {
        output: output.join('\n'),
        result: 'No result or error returned',
        replId: replId,
        image: result.data?.["png"] as string | undefined,
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to execute code on the ForeverVM REPL: ${error} \n\nreplId: ${replId}`)
  }
}

async function makeCreateMachineRequest(): Promise<string> {
  const forevervmToken = process.env.FOREVERVM_TOKEN
  if (!forevervmToken) {
    throw new Error('FOREVERVM_TOKEN is not set')
  }
  try {
    const fvm = new ForeverVM({ token: forevervmToken })

    const machine = await fvm.createMachine()

    return machine.machine_name
  } catch (error: any) {
    throw new Error(`Failed to create ForeverVM machine: ${error}`)
  }
}

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    if (name === RUN_REPL_TOOL_NAME) {
      const { pythonCode, replId } = ExecMachineSchema.parse(args)
      const execResponse = await makeExecReplRequest(pythonCode, replId)

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

      if(execResponse.image) {
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
      const replId = await makeCreateMachineRequest()
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

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error('Fatal error in main():', error)
  process.exit(1)
})

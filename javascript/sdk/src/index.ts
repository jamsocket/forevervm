import { Repl } from './repl'
import { env } from './env'
import type {
  ApiExecResponse,
  ApiExecResultResponse,
  ApiExecResultStreamResponse,
  CreateMachineRequest,
  CreateMachineResponse,
  ListMachinesRequest,
  ListMachinesResponse,
  WhoamiResponse,
} from './types'

export * from './types'
export * from './repl'

interface ForeverVMOptions {
  token?: string
  baseUrl?: string
  timeoutSec?: number
}

const DEFAULT_TIMEOUT_SEC = 15

export class ForeverVM {
  #token = env.FOREVERVM_TOKEN || ''
  #baseUrl = 'https://api.forevervm.com'
  #timeoutSec = DEFAULT_TIMEOUT_SEC

  constructor(options: ForeverVMOptions = {}) {
    if (options.token) this.#token = options.token
    if (options.baseUrl) this.#baseUrl = options.baseUrl
    if (options.timeoutSec) this.#timeoutSec = options.timeoutSec
  }

  get #headers() {
    return { 'authorization': `Bearer ${this.#token}`, 'x-forevervm-sdk': 'javascript' }
  }

  async #get(path: string) {
    const response = await fetch(`${this.#baseUrl}${path}`, { headers: this.#headers })
    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      throw new Error(`HTTP ${response.status}: ${text}`)
    }
    return await response.json()
  }

  async *#getStream(path: string) {
    const response = await fetch(`${this.#baseUrl}${path}`, { headers: this.#headers })
    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      throw new Error(`HTTP ${response.status}: ${text}`)
    }

    if (!response.body) return

    const decoder = new TextDecoderStream()
    const reader = response.body.pipeThrough(decoder).getReader()

    // buffer JSON just in case an object is split across multiple stream chunks
    let buffer = ''

    while (true) {
      let { done, value = '' } = await reader.read()
      if (done) return

      // loop until we've read all the data in this chunk
      while (value) {
        // find the next newline character
        const newline = value.indexOf('\n')

        // if there are no more newlines, add the remaining data to the buffer and break
        if (newline === -1) {
          buffer += value
          break
        }

        // parse and yield the next line from the data
        const line = value.slice(0, newline)
        yield JSON.parse(buffer + line)

        // remove the just-processed line from the value and reset the buffer
        value = value.slice(newline + 1)
        buffer = ''
      }
    }
  }

  async #post(path: string, body?: object) {
    let response
    try {
      response = await fetch(`${this.#baseUrl}${path}`, {
        method: 'POST',
        headers: { ...this.#headers, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
    } catch (error) {
      throw new Error(`Failed to fetch: ${error}`)
    }
    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      throw new Error(`HTTP ${response.status}: ${text}`)
    }

    return await response.json()
  }

  async whoami(): Promise<WhoamiResponse> {
    return await this.#get('/v1/whoami')
  }

  async createMachine(request: CreateMachineRequest = {}): Promise<CreateMachineResponse> {
    return await this.#post('/v1/machine/new', request)
  }

  async listMachines(request: ListMachinesRequest = {}): Promise<ListMachinesResponse> {
    return await this.#post('/v1/machine/list', request)
  }

  async exec(
    code: string,
    machineName?: string,
    interrupt: boolean = false,
    timeoutSec: number = this.#timeoutSec,
  ): Promise<ApiExecResponse> {
    if (!machineName) {
      const createResponse = await this.createMachine()
      machineName = createResponse.machine_name
    }

    return await this.#post(`/v1/machine/${machineName}/exec`, {
      instruction: { code, timeout_seconds: timeoutSec },
      interrupt,
    })
  }

  async execResult(machineName: string, instructionSeq: number): Promise<ApiExecResultResponse> {
    return await this.#get(`/v1/machine/${machineName}/exec/${instructionSeq}/result`)
  }

  async *execResultStream(
    machineName: string,
    instructionSeq: number,
  ): AsyncGenerator<ApiExecResultStreamResponse> {
    yield* this.#getStream(`/v1/machine/${machineName}/exec/${instructionSeq}/stream-result`)
  }

  repl(machineName?: string): Repl {
    return new Repl({
      machine: machineName,
      token: this.#token,
      baseUrl: this.#baseUrl.replace(/^http/, 'ws'),
    })
  }
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest

  const FOREVERVM_API_BASE = process.env.FOREVERVM_API_BASE || ''
  const FOREVERVM_TOKEN = process.env.FOREVERVM_TOKEN || ''

  test('whoami', async () => {
    const fvm = new ForeverVM({ token: FOREVERVM_TOKEN, baseUrl: FOREVERVM_API_BASE })

    const whoami = await fvm.whoami()
    expect(whoami.account).toBeDefined()
  })

  test('createMachine and listMachines', async () => {
    const fvm = new ForeverVM({ token: FOREVERVM_TOKEN, baseUrl: FOREVERVM_API_BASE })

    const machine = await fvm.createMachine()
    expect(machine.machine_name).toBeDefined()

    const machines = await fvm.listMachines()
    const found = machines.machines.find(({ name }) => name === machine.machine_name)
    expect(found).toBeDefined()
  })

  test('exec and execResult', async () => {
    const fvm = new ForeverVM({ token: FOREVERVM_TOKEN, baseUrl: FOREVERVM_API_BASE })
    const { machine_name } = await fvm.createMachine()
    const { instruction_seq } = await fvm.exec('print(123) or 567', machine_name)
    expect(instruction_seq).toBe(0)
    const result = await fvm.execResult(machine_name, instruction_seq as number)
    expect(result.result.value).toBe('567')
  })

  test('execResultStream', async () => {
    const fvm = new ForeverVM({ token: FOREVERVM_TOKEN, baseUrl: FOREVERVM_API_BASE })
    const { machine_name } = await fvm.createMachine()
    const { instruction_seq } = await fvm.exec('for i in range(10): print(i)\n"done"', machine_name)
    expect(instruction_seq).toBe(0)

    let i = 0
    for await (const item of fvm.execResultStream(machine_name, instruction_seq as number)) {
      if (item.type === 'result') {
        expect(item.result.value).toBe("'done'")
      } else if (item.type === 'output') {
        expect(item.chunk.stream).toBe('stdout')
        expect(item.chunk.data).toBe(`${i}`)
        expect(item.chunk.seq).toBe(i)
        i += 1
      }
    }
  })

  test('execResultStream with image', { timeout: 10000 }, async () => {
    const fvm = new ForeverVM({ token: FOREVERVM_TOKEN, baseUrl: FOREVERVM_API_BASE })
    const { machine_name } = await fvm.createMachine()

    const code = `import matplotlib.pyplot as plt
plt.plot([0, 1, 2], [0, 1, 2])
plt.title('Simple Plot')
plt.show()`

    const { instruction_seq } = await fvm.exec(code, machine_name)
    expect(instruction_seq).toBe(0)

    for await (const _ of fvm.execResultStream(machine_name, instruction_seq as number)) {
    }

    // if we reach this point, it means all the stream chunks were valid JSON
  })

  test('createMachine with tags', async () => {
    const fvm = new ForeverVM({ token: FOREVERVM_TOKEN, baseUrl: FOREVERVM_API_BASE })

    // Create machine with tags
    const taggedMachine = await fvm.createMachine({
      tags: { env: 'test', purpose: 'sdk-test' },
    })
    expect(taggedMachine.machine_name).toBeDefined()

    // List machines and verify tags
    const machines = await fvm.listMachines()
    const foundTagged = machines.machines.find(({ name }) => name === taggedMachine.machine_name)
    expect(foundTagged).toBeDefined()
    expect(foundTagged?.tags).toBeDefined()
    expect(foundTagged?.tags?.env).toBe('test')
    expect(foundTagged?.tags?.purpose).toBe('sdk-test')
  })

  test('listMachines with tag filter', async () => {
    const fvm = new ForeverVM({ token: FOREVERVM_TOKEN, baseUrl: FOREVERVM_API_BASE })

    // Create an untagged machine
    const untaggedMachine = await fvm.createMachine()
    expect(untaggedMachine.machine_name).toBeDefined()

    // Create a uniquely tagged machine
    const uniqueTag = `test-${Date.now()}`
    const taggedMachine = await fvm.createMachine({
      tags: { unique: uniqueTag },
    })
    expect(taggedMachine.machine_name).toBeDefined()

    // List machines with the unique tag filter
    const filteredMachines = await fvm.listMachines({
      tags: { unique: uniqueTag },
    })

    // Verify only our machine with the unique tag is returned
    expect(filteredMachines.machines.length).toBe(1)
    expect(filteredMachines.machines[0].tags?.unique).toBe(uniqueTag)
  })

  test('createMachine with memory limit', async () => {
    const fvm = new ForeverVM({ token: FOREVERVM_TOKEN, baseUrl: FOREVERVM_API_BASE })

    // Create machine with memory limit
    const machine = await fvm.createMachine({
      memory_mb: 512,
    })
    expect(machine.machine_name).toBeDefined()

    // Verify the machine was created (note: we can't directly verify the memory limit
    // through the API as it doesn't return this value in machine details)
    const machines = await fvm.listMachines()
    const found = machines.machines.find(({ name }) => name === machine.machine_name)
    expect(found).toBeDefined()
  })
}

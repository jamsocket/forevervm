import { Repl } from './repl'
import { env } from './env'
import type {
  ApiExecResponse,
  ApiExecResponseResult,
  CreateMachineResponse,
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
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  }

  async #post(path: string, body?: object) {
    const response = await fetch(`${this.#baseUrl}${path}`, {
      method: 'POST',
      headers: { ...this.#headers, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  }

  async whoami(): Promise<WhoamiResponse> {
    return await this.#get('/v1/whoami')
  }

  async createMachine(): Promise<CreateMachineResponse> {
    return await this.#post('/v1/machine/new')
  }

  async listMachines(): Promise<ListMachinesResponse> {
    return await this.#get('/v1/machine/list')
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

  async execResult(machineName: string, instructionSeq: number): Promise<ApiExecResponseResult> {
    return await this.#get(`/v1/machine/${machineName}/exec/${instructionSeq}/result`)
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
}

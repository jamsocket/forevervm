import { Repl } from './repl'
import type {
  ApiExecResponse,
  ApiExecResponseResult,
  CreateMachineResponse,
  ListMachinesResponse,
  WhoamiResponse,
} from './types'
import WebSocket from './ws'

export * from './types'
export * from './repl'

interface ForeverVMOptions {
  baseUrl?: string
}

export class ForeverVM {
  baseUrl = 'https://api.forevervm.com'

  constructor(
    private token: string,
    options: ForeverVMOptions = {},
  ) {
    if (options.baseUrl) this.baseUrl = options.baseUrl
  }

  private async getRequest(path: string) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  }

  private async postRequest(path: string, body?: object) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  }

  async whoami(): Promise<WhoamiResponse> {
    return await this.getRequest('/v1/whoami')
  }

  async createMachine(): Promise<CreateMachineResponse> {
    return await this.postRequest('/v1/machine/new')
  }

  async listMachines(): Promise<ListMachinesResponse> {
    return await this.getRequest('/v1/machine/list')
  }

  async exec(
    code: string,
    machineName?: string,
    interrupt: boolean = false,
  ): Promise<ApiExecResponse> {
    if (!machineName) {
      const createResponse = await this.createMachine()
      machineName = createResponse.machine_name
    }

    return await this.postRequest(`/v1/machine/${machineName}/exec`, {
      instruction: { code },
      interrupt,
    })
  }

  async execResult(machineName: string, instructionSeq: number): Promise<ApiExecResponseResult> {
    return await this.getRequest(`/v1/machine/${machineName}/exec/${instructionSeq}/result`)
  }

  async repl(machineName = 'new'): Promise<Repl> {
    return new Promise<Repl>((resolve, reject) => {
      const ws = new WebSocket(
        `${this.baseUrl.replace(/^http/, 'ws')}/v1/machine/${machineName}/repl`,
        { headers: { Authorization: `Bearer ${this.token}` } } as any,
      )

      ws.addEventListener('open', () => {
        resolve(new Repl(ws))
      })

      ws.addEventListener('error', reject)
    })
  }
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest

  const FOREVERVM_API_BASE = process.env.FOREVERVM_API_BASE || ''
  const FOREVERVM_TOKEN = process.env.FOREVERVM_TOKEN || ''

  test('whoami', async () => {
    const fvm = new ForeverVM(FOREVERVM_TOKEN, { baseUrl: FOREVERVM_API_BASE })

    const whoami = await fvm.whoami()
    expect(whoami.account).toBeDefined()
  })

  test('createMachine and listMachines', async () => {
    const fvm = new ForeverVM(FOREVERVM_TOKEN, { baseUrl: FOREVERVM_API_BASE })

    const machine = await fvm.createMachine()
    expect(machine.machine_name).toBeDefined()

    const machines = await fvm.listMachines()
    const found = machines.machines.find(({ name }) => name === machine.machine_name)
    expect(found).toBeDefined()
  })

  test('exec and execResult', async () => {
    const fvm = new ForeverVM(FOREVERVM_TOKEN, { baseUrl: FOREVERVM_API_BASE })
    const { machine_name } = await fvm.createMachine()
    const { instruction_seq } = await fvm.exec('print(123) or 567')
    expect(instruction_seq).toBe(0)
    const result = await fvm.execResult(machine_name, instruction_seq!!!)
    expect(result.result.value).toBe('567')
  })
}

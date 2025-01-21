import { WebSocket } from 'ws'
import { ReplClient } from './repl'
import {
  ApiExecResponse,
  ApiExecResponseResult,
  CreateMachineResponse,
  ListMachinesResponse,
  WhoamiResponse,
} from './types'

export * from './types'
export * from './repl'

export class ForeverVM {
  constructor(private baseUrl: string, private token: string) {}

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

  async execMachine(
    code: string,
    machineName?: string,
    interrupt: boolean = false,
  ): Promise<ApiExecResponse> {
    if (!machineName) {
      const createResponse = await this.createMachine()
      machineName = createResponse.machine_name
    }

    return await this.postRequest(`/v1/machine/${machineName}/exec`, {
      instruction: {
        code,
      },
      interrupt,
    })
  }

  async execResult(machineName: string, instructionSeq: number): Promise<ApiExecResponseResult> {
    return await this.getRequest(`/v1/machine/${machineName}/exec/${instructionSeq}`)
  }

  async repl(machineName: string): Promise<ReplClient> {
    return new Promise<ReplClient>((resolve, reject) => {
      const ws = new WebSocket(
        `${this.baseUrl.replace(/^http/, 'ws')}/v1/machine/${machineName}/repl`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        },
      )

      ws.on('open', () => {
        resolve(new ReplClient(ws))
      })

      ws.on('error', (error) => {
        reject(error)
      })
    })
  }
}

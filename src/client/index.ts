import { ReplClient } from './repl.js'
import { WebSocket } from 'ws'

export interface WhoamiResponse {
  account: string
}

export interface CreateMachineResponse {
  machine_name: string
}

export interface Machine {
  name: string
  created_at: string
  running: boolean
  has_pending_instructions: boolean
  expires_at?: string
}

export interface ListMachinesResponse {
  machines: Machine[]
}

export interface ApiExecRequest {
  instruction: {
    code: string
    max_duration_seconds?: number
  }
  interrupt: boolean
}

export interface ApiExecResponse {
  instruction_seq?: number
  interrupted: boolean
}

export interface ApiExecResponseResult {
  instruction_seq: number
  result: {
    value?: string | null
    error?: string
    runtime_ms: number
  }
}

export class ForeverVMClient {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

  async getRequest(path: string) {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  async postRequest(path: string, body?: object) {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: body && JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  async whoami(): Promise<WhoamiResponse> {
    const response = await this.getRequest('/v1/whoami')
    return response
  }

  async createMachine(): Promise<CreateMachineResponse> {
    const response = await this.postRequest('/v1/machine/new')
    return response
  }

  async listMachines(): Promise<ListMachinesResponse> {
    const response = await this.getRequest('/v1/machine/list')
    return response
  }

  async execMachine(
    code: string,
    machineName?: string,
    interrupt: boolean = false,
  ): Promise<ApiExecResponse> {
    const response = await this.postRequest(`/v1/machine/${machineName}/exec`, {
      instruction: { code },
      interrupt,
    })
    return response
  }

  async execResult(machineName: string, instructionSeq: number): Promise<ApiExecResponseResult> {
    const response = await this.getRequest(
      `/v1/machine/${machineName}/exec/${instructionSeq}/result`,
    )
    return response
  }

  async repl(machineName: string): Promise<ReplClient> {
    let url = new URL(this.baseUrl)
    if (url.protocol === 'http:') {
      url.protocol = 'ws:'
    } else {
      url.protocol = 'wss:'
    }
    url.pathname = `/v1/machine/${machineName}/repl`

    const ws = new WebSocket(url.href, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })

    return new ReplClient(ws)
  }
}

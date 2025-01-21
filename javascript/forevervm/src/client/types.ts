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

export interface Instruction {
  code: string
  max_duration_seconds?: number
}

export interface ApiExecRequest {
  instruction: Instruction
  interrupt: boolean
}

export interface ApiExecResponse {
  instruction_seq?: number
  interrupted: boolean
}

export interface ApiExecResponseResult {
  instruction_id: number
  result: {
    value?: string | null
    error?: string
    runtime_ms: number
  }
}

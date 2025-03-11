export interface StandardOutput {
  stream: 'stdout' | 'stderr'
  data: string
  seq: number
}

export interface ConnectedMessageFromServer {
  type: 'connected'
  machine_name: string
}

export interface ExecMessageFromServer {
  type: 'exec_received'
  seq: number // TODO: rename to instruction_id
  request_id: number
}

export interface ResultMessageFromServer {
  type: 'result'
  instruction_id: number
  result: ExecResponse
}

export interface OutputMessageFromServer {
  type: 'output'
  chunk: StandardOutput
  instruction_id: number
}

export interface ErrorMessageFromServer {
  type: 'error'
  code: string
  id: string
}

export type MessageFromServer =
  | ConnectedMessageFromServer
  | ExecMessageFromServer
  | ResultMessageFromServer
  | OutputMessageFromServer
  | ErrorMessageFromServer

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
  code: string
  max_duration_seconds?: number
  interrupt: boolean
}

export interface ApiExecResponse {
  instruction_seq?: number
  interrupted: boolean
}

export interface ExecResponse {
  value?: string | null
  data?: { [key: string]: unknown }
  error?: string
  runtime_ms: number
}

export interface ApiExecResultResponse {
  instruction_seq: number
  result: ExecResponse
  value?: string | null
  error?: string
  runtime_ms: number
}

export type ApiExecResultStreamResponse = OutputMessageFromServer | ResultMessageFromServer

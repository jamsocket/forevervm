import { Stream } from './stream'
import { ExecResponse } from './types'

export interface ExecOptions {
  timeout?: number
  interrupt?: boolean
}

export interface Instruction {
  code: string
  max_duration_seconds?: number
}

export type MessageToServer = {
  type: 'exec'
  instruction: Instruction
  request_id: number
}

export type StandardOutput = {
  stream: 'stdout' | 'stderr'
  data: string
  seq: number
}

export type MessageFromServer =
  | {
      type: 'exec_received'
      seq: number // TODO: rename to instruction_id
      request_id: number
    }
  | {
      type: 'result'
      instruction_id: number
      result: ExecResponse
    }
  | {
      type: 'output'
      chunk: StandardOutput
      instruction_id: number
    }

type ConnectionState =
  | {
      type: 'idle'
    }
  | {
      type: 'waiting_for_instruction_seq'
      request_id: number
      callback: (instruction_seq: number) => void
    }
  | {
      type: 'waiting_for_result'
      resultCallback: (result: ExecResponse) => void
      outputCallback: (output: StandardOutput) => void
      instruction_id: number
    }

export class ReplClient {
  private ws: WebSocket
  private state: ConnectionState = { type: 'idle' }
  private nextRequestId = 0

  constructor(ws: WebSocket) {
    this.ws = ws
    this.ws.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data.toString()) as MessageFromServer
      this.recv(message)
    })
  }

  private recv(message: MessageFromServer) {
    switch (message.type) {
      case 'exec_received': {
        if (this.state.type !== 'waiting_for_instruction_seq') {
          console.warn('Unexpected message in state', this.state, 'with message', message)
          return
        }

        if (message.request_id !== this.state.request_id) {
          console.warn('Unexpected request id', this.state, 'with message', message)
          return
        }

        this.state.callback(message.seq)
        break
      }

      case 'output': {
        if (this.state.type !== 'waiting_for_result') {
          console.warn('Unexpected message in state', this.state, 'with message', message)
          return
        }

        if (message.instruction_id !== this.state.instruction_id) {
          console.warn('Unexpected instruction id', this.state, 'with message', message)
          return
        }

        this.state.outputCallback(message.chunk)
        break
      }

      case 'result': {
        if (this.state.type !== 'waiting_for_result') {
          console.warn('Unexpected message in state', this.state, 'with message', message)
          return
        }

        if (message.instruction_id !== this.state.instruction_id) {
          console.warn('Unexpected instruction id', this.state, 'with message', message)
          return
        }

        this.state.resultCallback(message.result)
        this.state = { type: 'idle' }
        break
      }
    }
  }

  private send(message: MessageToServer) {
    this.ws.send(JSON.stringify(message))
  }

  async exec(code: string, options: ExecOptions = {}): Promise<ReplExecResult> {
    const request_id = this.nextRequestId++
    const instruction = { code, max_runtime_ms: options.timeout }
    const instructionSeq = await new Promise<number>((resolve) => {
      this.state = {
        type: 'waiting_for_instruction_seq',
        request_id,
        callback: resolve,
      }
      this.send({ type: 'exec', instruction, request_id })
    })

    const result = new ReplExecResult()
    this.state = {
      type: 'waiting_for_result',
      instruction_id: instructionSeq,
      resultCallback: (execResult) => result.setResult(execResult),
      outputCallback: (output) => result.addOutput(output),
    }
    return result
  }
}

export class ReplExecResult {
  private resultPromise: Promise<ExecResponse>
  private output: Stream<StandardOutput> = new Stream()
  private resultResolver?: (result: ExecResponse) => void

  constructor() {
    this.resultPromise = new Promise<ExecResponse>((resolve) => {
      this.resultResolver = resolve
    })
  }

  setResult(result: ExecResponse) {
    if (this.resultResolver) {
      this.resultResolver(result)
    }
    if (this.output) {
      this.output.close()
    }
  }

  addOutput(output: StandardOutput) {
    this.output.push(output)
  }

  async nextOutput(): Promise<StandardOutput | null> {
    return await this.output.next()
  }

  async result(): Promise<ExecResponse> {
    return await this.resultPromise
  }
}

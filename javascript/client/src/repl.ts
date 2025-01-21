import { WebSocket } from 'ws'
import { ApiExecResponseResult } from './types'

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
      result: ApiExecResponseResult
    }
  | {
      type: 'output'
      output: StandardOutput
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
      result_callback: (result: ApiExecResponseResult) => void
      output_callback: (output: StandardOutput) => void
      instruction_id: number
    }

export class ReplClient {
  private ws: WebSocket
  private state: ConnectionState = { type: 'idle' }
  private nextRequestId = 0

  constructor(ws: WebSocket) {
    this.ws = ws
    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString()) as MessageFromServer
      this.recv(message)
    })
  }

  private recv(message: MessageFromServer) {
    console.log('recv', message)
    if (message.type === 'exec_received') {
      if (this.state.type === 'waiting_for_instruction_seq') {
        if (message.request_id === this.state.request_id) {
          this.state.callback(message.seq)
          this.state = { type: 'idle' }
        } else {
          console.warn('Unexpected request id', this.state, 'with message', message)
        }
      } else {
        console.warn('Unexpected message in state', this.state, 'with message', message)
      }
    } else if (message.type === 'result') {
      if (this.state.type === 'waiting_for_result') {
        if (message.instruction_id === this.state.instruction_id) {
          this.state.result_callback(message.result)
          this.state = { type: 'idle' }
        } else {
          console.warn('Unexpected instruction id', this.state, 'with message', message)
        }
      } else {
        console.warn('Unexpected message in state', this.state, 'with message', message)
      }
    } else if (message.type === 'output') {
      if (this.state.type === 'waiting_for_result') {
        if (message.instruction_id === this.state.instruction_id) {
          this.state.output_callback(message.output)
        } else {
          console.warn('Unexpected instruction id', this.state, 'with message', message)
        }
      } else {
        console.warn('Unexpected message in state', this.state, 'with message', message)
      }
    }
  }

  private send(message: MessageToServer) {
    this.ws.send(JSON.stringify(message))
  }

  async exec(instruction: Instruction): Promise<ReplExecResult> {
    const request_id = this.nextRequestId++
    const instructionSeq = await new Promise<number>((resolve) => {
      this.state = {
        type: 'waiting_for_instruction_seq',
        request_id,
        callback: resolve,
      }
      this.send({
        type: 'exec',
        instruction,
        request_id,
      })
    })

    const result = new ReplExecResult(instructionSeq)
    this.state = {
      type: 'waiting_for_result',
      instruction_id: instructionSeq,
      result_callback: (execResult) => result.setResult(execResult),
      output_callback: (output) => result.addOutput(output),
    }
    return result
  }
}

export class ReplExecResult {
  private instruction_id: number
  private resultPromise: Promise<ApiExecResponseResult>
  private output: StandardOutput[] = []
  private outputResolver?: () => void
  private outputPromise: Promise<void>
  private resultResolver?: (result: ApiExecResponseResult) => void

  constructor(instruction_id: number) {
    this.instruction_id = instruction_id

    this.resultPromise = new Promise<ApiExecResponseResult>((resolve) => {
      this.resultResolver = resolve
    })

    this.outputPromise = new Promise<void>((resolve) => {
      this.outputResolver = resolve
    })
  }

  setOutputPromise() {
    if (this.outputResolver) {
      this.outputResolver()
    }
    this.outputPromise = new Promise<void>((resolve) => {
      this.outputResolver = resolve
    })
  }

  setResult(result: ApiExecResponseResult) {
    if (this.resultResolver) {
      this.resultResolver(result)
    }
    if (this.outputResolver) {
      this.outputResolver()
    }
  }

  addOutput(output: StandardOutput) {
    this.output.push(output)
    if (this.outputResolver) {
      this.outputResolver()
    }
  }

  async nextOutput(): Promise<StandardOutput | null> {
    if (this.output.length > 0) {
      return this.output.shift()!
    }
    const result = await Promise.race([
      this.resultPromise.then(() => null),
      this.outputPromise.then(() => this.output.shift()!),
    ])
    if (result === null) {
      return null
    }
    this.setOutputPromise()
    return result
  }

  async result(): Promise<ApiExecResponseResult> {
    return await this.resultPromise
  }
}

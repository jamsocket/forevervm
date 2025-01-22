import { Stream } from './stream'
import { ExecResponse } from './types'

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
    console.log('RECV', message)
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
          this.state.resultCallback(message.result)
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
          this.state.outputCallback(message.chunk)
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

import { WebSocket } from 'ws'
import { ApiExecResponseResult, Instruction } from './types.js'

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
      seq: number
      request_id: number
    }
  | (ApiExecResponseResult & { type: 'result' })
  | {
      type: 'output'
      chunk: StandardOutput
      instruction_id: number
    }
  | {
      type: 'error'
      code: string
      id: string
    }

type ConnectionState =
  | { type: 'idle' }
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
  ws: WebSocket
  state: ConnectionState = { type: 'idle' }
  nextRequestId = 0

  constructor(ws: WebSocket) {
    this.ws = ws
    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString()) as MessageFromServer
      this.recv(message)
    })
  }

  recv(message: MessageFromServer) {
    switch (message.type) {
      case 'exec_received':
        if (
          this.state.type === 'waiting_for_instruction_seq' &&
          this.state.request_id === message.request_id
        ) {
          this.state.callback(message.seq)
        } else {
          console.warn('Unexpected message in state', this.state, 'with message', message)
        }
        break
      case 'result':
        if (
          this.state.type === 'waiting_for_result' &&
          this.state.instruction_id === message.instruction_id
        ) {
          this.state.result_callback(message)
        } else {
          console.warn('Unexpected message in state', this.state, 'with message', message)
        }
        break
      case 'output':
        if (
          this.state.type === 'waiting_for_result' &&
          this.state.instruction_id === message.instruction_id
        ) {
          this.state.output_callback(message.chunk)
        } else {
          console.warn('Unexpected message in state', this.state, 'with message', message)
        }
        break
      case 'error':
        console.error(message.code, message.id)
        break
      default:
        console.warn('Unknown message', message)
        break
    }
  }

  send(message: MessageToServer) {
    this.ws.send(JSON.stringify(message))
  }

  async exec(instruction: Instruction) {
    let requestId = this.nextRequestId++

    this.send({
      type: 'exec',
      instruction,
      request_id: requestId,
    })

    let resolve: (instruction_seq: number) => void
    let promise = new Promise<number>((resolve_) => {
      resolve = resolve_
    })

    this.state = {
      type: 'waiting_for_instruction_seq',
      request_id: requestId,
      callback: resolve!,
    }

    let instruction_seq = await promise

    let result = new ReplExecResult(instruction_seq)

    this.state = {
      type: 'waiting_for_result',
      instruction_id: instruction_seq,
      result_callback: result.setResult.bind(result),
      output_callback: result.addOutput.bind(result),
    }

    return result
  }
}

export class ReplExecResult {
  instruction_id: number
  resultPromise: Promise<ApiExecResponseResult>
  output: StandardOutput[] = []

  outputResolver?: () => void
  outputPromise: Promise<void>
  resultResolver?: (result: ApiExecResponseResult) => void

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
    this.outputPromise = new Promise<void>((resolve) => {
      this.outputResolver = resolve
    })
  }

  setResult(result: ApiExecResponseResult) {
    if (this.resultResolver) {
      this.resultResolver(result)
    }
    if (this.outputResolver) {
      // calling the output resolver without putting output in the queue
      // will cause it to return undefined
      this.outputResolver()
    }
  }

  addOutput(output: StandardOutput) {
    this.output.push(output)
    if (this.outputResolver) {
      this.outputResolver()
    }
    this.setOutputPromise()
  }

  async nextOutput() {
    if (this.output.length > 0) {
      return this.output.shift()
    }

    await Promise.any([this.outputPromise, this.resultPromise])

    if (this.output.length > 0) {
      return this.output.shift()
    }
  }

  async result() {
    return await this.resultPromise
  }
}

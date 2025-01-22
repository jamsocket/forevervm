import { ExecResponse } from './types'

export interface ExecOptions {
  timeoutSeconds?: number
  interrupt?: boolean
}

export interface Instruction {
  code: string
  max_duration_seconds?: number
  timeout_seconds?: number
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

export class ReplClient {
  private ws: WebSocket
  private listener = new EventTarget()
  private nextRequestId = 0

  constructor(ws: WebSocket) {
    this.ws = ws
    this.ws.addEventListener('message', ({ data }) => {
      const msg = JSON.parse(data.toString())
      this.listener.dispatchEvent(new CustomEvent('msg', { detail: msg }))
    })
  }

  private send(message: MessageToServer) {
    this.ws.send(JSON.stringify(message))
  }

  exec(code: string, options: ExecOptions = {}): ReplExecResult {
    const request_id = this.nextRequestId++
    const instruction = {
      code,
      max_runtime_ms: options.timeoutSeconds,
      timeout_seconds: options.timeoutSeconds,
    }

    this.send({ type: 'exec', instruction, request_id })
    this.listener = new EventTarget()
    return new ReplExecResult(request_id, this.listener)
  }
}

export class ReplExecResult {
  #requestId: number
  #listener: EventTarget

  // instruction state
  #instructionId: number | undefined

  // stdout/stderr state
  #buffer: StandardOutput[] = []
  #advance: (() => void) | undefined = undefined

  // result state
  #done = false
  #resolve: (response: ExecResponse) => void
  #reject: (reason: any) => void

  result: Promise<ExecResponse>
  output: AsyncIterable<StandardOutput, undefined>

  constructor(requestId: number, listener: EventTarget) {
    this.#requestId = requestId
    this.#listener = listener
    this.#listener.addEventListener('msg', this)

    const { promise, resolve, reject } = Promise.withResolvers<ExecResponse>()
    this.result = promise
    this.#resolve = resolve
    this.#reject = reject

    this.output = {
      [Symbol.asyncIterator]: () => ({
        next: async () => {
          while (true) {
            const value = this.#buffer.shift()
            if (value) return { value, done: false }

            if (this.#done) return { done: true }

            const { promise, resolve } = Promise.withResolvers<void>()
            this.#advance = resolve
            await promise
          }
        },
      }),
    }
  }

  #flush() {
    while (this.#advance) {
      this.#advance()
      this.#advance = undefined
    }
  }

  handleEvent(event: CustomEvent) {
    const msg = event.detail as MessageFromServer
    switch (msg.type) {
      case 'exec_received':
        if (msg.request_id !== this.#requestId) {
          console.warn(`Expected request ID ${this.#requestId} with message`, msg)
          break
        }

        this.#instructionId = msg.seq
        break

      case 'output':
        if (msg.instruction_id !== this.#instructionId) {
          console.warn(`Expected instruction ID ${this.#instructionId} with message`, msg)
          break
        }

        this.#buffer.push(msg.chunk)
        this.#flush()
        break

      case 'result':
        if (msg.instruction_id !== this.#instructionId) {
          console.warn(`Expected instruction ID ${this.#instructionId} with message`, msg)
          break
        }

        this.#done = true
        this.#flush()
        this.#resolve(msg.result)
        break
    }
  }
}

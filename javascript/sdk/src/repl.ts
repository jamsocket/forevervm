import type { ExecResponse } from './types'
import type WebSocket from './ws'

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
  | {
      type: 'error'
      code: string
      id: string
    }

export class Repl {
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
  #resolve: (response: ExecResponse) => void = () => {}
  #reject: (reason: any) => void = () => {}

  result: Promise<ExecResponse>

  constructor(requestId: number, listener: EventTarget) {
    this.#requestId = requestId
    this.#listener = listener
    this.#listener.addEventListener('msg', this)

    this.result = new Promise<ExecResponse>((resolve, reject) => {
      this.#resolve = resolve
      this.#reject = reject
    })
  }

  get output(): { [Symbol.asyncIterator](): AsyncIterator<StandardOutput, void, unknown> } {
    return {
      [Symbol.asyncIterator]: () => ({
        next: async () => {
          while (true) {
            const value = this.#buffer.shift()
            if (value) return { value, done: false }

            if (this.#done) return { value: undefined, done: true }

            await new Promise<void>((resolve) => {
              this.#advance = resolve
            })
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

      case 'error':
        this.#reject(new Error(msg.code))
    }
  }
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest

  const FOREVERVM_API_BASE = process.env.FOREVERVM_API_BASE || ''
  const FOREVERVM_TOKEN = process.env.FOREVERVM_TOKEN || ''

  async function websocket() {
    const { default: WebSocket } = await import('ws')
    const ws = new WebSocket(`${FOREVERVM_API_BASE.replace(/^http/, 'ws')}/v1/machine/new/repl`, {
      headers: { Authorization: `Bearer ${FOREVERVM_TOKEN}` },
    } as any)

    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve)
      ws.addEventListener('error', reject)
    })

    return ws
  }

  test('return value', async () => {
    const repl = new Repl(await websocket())

    const { value, error } = await repl.exec('1 + 1').result
    expect(value).toBe('2')
    expect(error).toBeUndefined()
  })

  test('output', async () => {
    const repl = new Repl(await websocket())

    const { value, error } = await repl.exec('1 + 1').result
    expect(value).toBe('2')
    expect(error).toBeUndefined()

    const output = repl.exec('for i in range(5):\n print(i)').output
    let i = 0
    for await (const { data, stream, seq } of output) {
      expect(data).toBe(`${i}`)
      expect(stream).toBe('stdout')
      // expect(seq).toBe(i)
      i += 1
    }

    const { done } = await output[Symbol.asyncIterator]().next()
    expect(done).toBe(true)
  })
}

import type { WebSocket as NodeWebSocket } from 'ws'

import type { ExecResponse } from './types'
import { websocket } from './ws'

export interface ExecOptions {
  timeoutSeconds?: number
  interrupt?: boolean
}

export interface Instruction {
  code: string
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
      type: 'connected'
      machine_name: string
    }
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

interface ReplOptions {
  baseUrl?: string
  token?: string
}

let createWebsocket = websocket

export class Repl {
  #baseUrl = 'wss://api.forevervm.com'
  #token = process.env.FOREVERVM_TOKEN || ''
  #machine = ''

  #ws: WebSocket | NodeWebSocket
  #listener = new EventTarget()
  #queued: MessageToServer | undefined
  #nextRequestId = 0

  constructor(machine?: string, options?: ReplOptions)
  constructor(options?: ReplOptions)
  constructor(machine?: string | ReplOptions, options?: ReplOptions) {
    const opts = (typeof machine === 'string' ? options : machine) ?? {}
    const mach = typeof machine === 'string' ? machine : 'new'

    this.#machine = mach
    if (opts.token) this.#token = opts.token
    if (opts.baseUrl) this.#baseUrl = opts.baseUrl

    if (!this.#token) {
      throw new Error(
        'foreverVM token must be supplied as either `options.token` or the environment variable `FOREVERVM_TOKEN`.',
      )
    }

    this.#ws = this.#connect()
  }

  #connect() {
    const url = `${this.#baseUrl}/v1/machine/${this.#machine}/repl`

    this.#ws = createWebsocket(url, this.#token)
    this.#ws.addEventListener('open', () => {
      const queued = this.#queued
      this.#queued = undefined
      if (queued) this.#send(queued)
    })
    this.#ws.addEventListener('close', () => this.#connect())
    this.#ws.addEventListener('error', () => this.#connect())
    this.#ws.addEventListener('message', ({ data }) => {
      const msg = JSON.parse(data.toString()) as MessageFromServer
      if (msg.type === 'connected') this.#machine = msg.machine_name

      this.#listener.dispatchEvent(new CustomEvent('msg', { detail: msg }))
    })
    return this.#ws
  }

  #send(message: MessageToServer) {
    if (this.connected) this.#ws.send(JSON.stringify(message))
    else this.#queued = message
  }

  get connected() {
    return this.#ws.readyState === this.#ws.OPEN
  }

  exec(code: string, options: ExecOptions = {}): ReplExecResult {
    const request_id = this.#nextRequestId++
    const instruction = { code, timeout_seconds: options.timeoutSeconds }

    this.#send({ type: 'exec', instruction, request_id })
    this.#listener = new EventTarget()
    return new ReplExecResult(request_id, this.#listener)
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
  const { test, expect, beforeAll } = import.meta.vitest

  const FOREVERVM_TOKEN = process.env.FOREVERVM_TOKEN || ''
  const FOREVERVM_API_BASE = process.env.FOREVERVM_API_BASE || ''

  let ws: WebSocket | NodeWebSocket
  beforeAll(() => {
    createWebsocket = (url: string, token: string) => {
      ws = websocket(url, token)
      return ws
    }
  })

  test.sequential('explicit token', async () => {
    const repl = new Repl({ token: FOREVERVM_TOKEN, baseUrl: FOREVERVM_API_BASE })

    const { value, error } = await repl.exec('1 + 1').result
    expect(value).toBe('2')
    expect(error).toBeUndefined()
  })

  test.sequential('return value', async () => {
    const repl = new Repl({ baseUrl: FOREVERVM_API_BASE })

    const { value, error } = await repl.exec('1 + 1').result
    expect(value).toBe('2')
    expect(error).toBeUndefined()
  })

  test.sequential('output', async () => {
    const repl = new Repl({ baseUrl: FOREVERVM_API_BASE })

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

  test.sequential('reconnect', async () => {
    const repl = new Repl({ token: FOREVERVM_TOKEN, baseUrl: FOREVERVM_API_BASE })

    await repl.exec('1 + 1').result

    ws.close()

    const { value, error } = await repl.exec('1 + 1').result
    expect(value).toBe('2')
    expect(error).toBeUndefined()
  })
}

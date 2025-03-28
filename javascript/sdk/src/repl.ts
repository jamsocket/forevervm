import WebSocket from 'isomorphic-ws'

import { env } from './env'
import type { ExecResponse, MessageFromServer, StandardOutput } from './types'

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

interface ReplOptions {
  baseUrl?: string
  token?: string
  machine?: string
}

let createWebsocket = function (url: string, token: string) {
  if (typeof window === 'undefined') {
    return new WebSocket(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'x-forevervm-sdk': 'javascript' },
    })
  }

  return new WebSocket(url + `?_forevervm_jwt=${token}`)
}

if (typeof CustomEvent !== 'function') {
  class CustomEvent extends Event {
    type: string
    detail: any
    bubbles: boolean
    cancelable: boolean

    constructor(type: string, params: any = {}) {
      super(type, params)
      this.type = type
      this.detail = params.detail || null
      this.bubbles = !!params.bubbles
      this.cancelable = !!params.cancelable
    }
  }

  // Make it globally available
  ;(global as any).CustomEvent = CustomEvent
}

export class Repl {
  #baseUrl = 'wss://api.forevervm.com'
  #token = env.FOREVERVM_TOKEN || ''
  #machine: string | null = null

  #ws: WebSocket
  #listener = new EventTarget()
  #queued: MessageToServer | undefined
  #nextRequestId = 0
  #retries = 0

  constructor(options: ReplOptions = {}) {
    if (options.token) this.#token = options.token
    if (options.baseUrl) this.#baseUrl = options.baseUrl
    if (options.machine) this.#machine = options.machine

    if (!this.#token) {
      throw new Error(
        'foreverVM token must be supplied as either `options.token` or the environment variable `FOREVERVM_TOKEN`.',
      )
    }

    this.#ws = this.#connect()
  }

  #connect() {
    if (this.#ws && this.#ws.readyState !== WebSocket.CLOSED) return this.#ws

    const machine = this.#machine || 'new'
    const url = `${this.#baseUrl}/v1/machine/${machine}/repl`

    this.#ws = createWebsocket(url, this.#token)
    this.#ws.addEventListener('open', () => {
      this.#retries = 0

      const queued = this.#queued
      this.#queued = undefined
      if (queued) this.#send(queued)
    })

    this.#ws.addEventListener('close', () => this.#reconnect())
    this.#ws.addEventListener('error', () => this.#reconnect())
    this.#ws.addEventListener('message', ({ data }) => {
      const msg = JSON.parse(data.toString()) as MessageFromServer
      if (msg.type === 'connected') {
        if (this.#machine && this.#machine !== msg.machine_name) {
          console.warn(`Expected machine name ${this.#machine} but recevied ${msg.machine_name}`)
        }

        this.#machine = msg.machine_name
      }

      this.#listener.dispatchEvent(new CustomEvent('msg', { detail: msg }))
    })

    return this.#ws
  }

  async #reconnect() {
    if (this.connecting) return
    if (this.#retries > 0) {
      const wait = 2 ** (this.#retries - 1)
      await new Promise((resolve) => setTimeout(resolve, wait))
    }

    this.#retries += 1
    this.#connect()
  }

  #send(message: MessageToServer) {
    if (this.connected) this.#ws.send(JSON.stringify(message))
    else this.#queued = message
  }

  get machineName() {
    return this.#machine
  }

  get connected() {
    return this.#ws?.readyState === WebSocket.OPEN
  }

  get connecting() {
    return this.#ws?.readyState === WebSocket.CONNECTING
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

  let ws: WebSocket
  beforeAll(() => {
    createWebsocket = (url: string, token: string) => {
      ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } })
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

    const output = repl.exec('for i in range(5):\n print(i)').output
    let i = 0
    for await (const { data, stream, seq } of output) {
      expect(data).toBe(`${i}`)
      expect(stream).toBe('stdout')
      expect(seq).toBe(i)
      i += 1
    }

    const { done } = await output[Symbol.asyncIterator]().next()
    expect(done).toBe(true)
  })

  test.sequential('error', async () => {
    const repl = new Repl({ baseUrl: FOREVERVM_API_BASE })

    const { value, error } = await repl.exec('1 / 0').result
    expect(value).toBeUndefined()
    expect(error).toMatch('ZeroDivisionError')
  })

  test.sequential('reconnect', { timeout: 10000 }, async () => {
    const repl = new Repl({ token: FOREVERVM_TOKEN, baseUrl: FOREVERVM_API_BASE })

    await repl.exec('1 + 1').result
    const machineName = repl.machineName

    ws.close()

    const { value, error } = await repl.exec('1 + 1').result
    expect(value).toBe('2')
    expect(error).toBeUndefined()

    expect(repl.machineName).toBe(machineName)
  })
}

/**
 * Asynchronous stream.
 *
 * Designed for a single consumer; if there are multiple consumers each item will only be consumed
 * by one consumer.
 */
export class Stream<T> {
  buffer: T[]
  closed: boolean = false
  resolve?: () => void

  constructor() {
    this.buffer = []
  }

  push(value: T) {
    this.buffer.push(value)

    if (this.resolve) {
      this.resolve()
    }
  }

  close() {
    this.closed = true

    if (this.resolve) {
      this.resolve()
    }
  }

  async next(): Promise<T | null> {
    while (true) {
      let d = this.buffer.shift()
      if (d !== undefined) {
        return d
      }

      if (this.closed) {
        return null
      }

      await new Promise<void>((resolve) => {
        this.resolve = resolve
      })
    }
  }
}

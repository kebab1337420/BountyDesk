export interface ThrottlerOptions {
  capacity: number
  refillPerInterval: number
  refillIntervalMs: number
  now?: () => number
  setIntervalImpl?: (cb: () => void, ms: number) => ReturnType<typeof setInterval>
  clearIntervalImpl?: (handle: ReturnType<typeof setInterval>) => void
}

export class Throttler {
  private readonly capacity: number
  private readonly refillPerInterval: number
  private readonly now: () => number
  private readonly setIntervalImpl: (cb: () => void, ms: number) => ReturnType<typeof setInterval>
  private readonly clearIntervalImpl: (handle: ReturnType<typeof setInterval>) => void
  private readonly refillIntervalMs: number

  private tokens: number
  private lastRefill: number
  private waiters: Array<{ resolve: () => void; reject: (error: Error) => void }> = []
  private interval: ReturnType<typeof setInterval> | null = null

  constructor(options: ThrottlerOptions) {
    this.capacity = options.capacity
    this.refillPerInterval = options.refillPerInterval
    this.refillIntervalMs = options.refillIntervalMs
    this.now = options.now ?? (() => Date.now())
    this.setIntervalImpl = options.setIntervalImpl ?? ((cb, ms) => setInterval(cb, ms))
    this.clearIntervalImpl = options.clearIntervalImpl ?? ((handle) => clearInterval(handle))
    this.tokens = this.capacity
    this.lastRefill = this.now()
  }

  get available(): number {
    this.step()
    return this.tokens
  }

  async acquire(): Promise<void> {
    this.step()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return
    }
    await new Promise<void>((resolve, reject) => {
      this.waiters.push({ resolve, reject })
      this.updateInterval()
    })
  }

  dispose(): void {
    if (this.interval !== null) {
      this.clearIntervalImpl(this.interval)
      this.interval = null
    }
    const pending = this.waiters
    this.waiters = []
    for (const waiter of pending) {
      waiter.reject(new Error('Throttler arrêté.'))
    }
  }

  private step(): void {
    const now = this.now()
    const elapsed = Math.max(0, now - this.lastRefill)
    if (elapsed >= this.refillIntervalMs) {
      const intervals = Math.floor(elapsed / this.refillIntervalMs)
      this.tokens = Math.min(this.capacity, this.tokens + intervals * this.refillPerInterval)
      this.lastRefill += intervals * this.refillIntervalMs
    }
    this.drain()
  }

  private drain(): void {
    while (this.tokens >= 1 && this.waiters.length > 0) {
      this.tokens -= 1
      const waiter = this.waiters.shift()
      waiter?.resolve()
    }
    this.updateInterval()
  }

  private updateInterval(): void {
    if (this.waiters.length > 0 && this.interval === null) {
      this.interval = this.setIntervalImpl(() => {
        this.step()
      }, this.refillIntervalMs)
    } else if (this.waiters.length === 0 && this.interval !== null) {
      this.clearIntervalImpl(this.interval)
      this.interval = null
    }
  }
}
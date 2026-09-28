import { afterEach, describe, expect, it, vi } from 'vitest'
import { Throttler } from '../src/services/intigriti/throttler'

describe('Throttler', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('laisse passer un burst dans la limite de capacité', async () => {
    vi.useFakeTimers()
    const throttler = new Throttler({ capacity: 3, refillPerInterval: 1, refillIntervalMs: 100 })
    await throttler.acquire()
    await throttler.acquire()
    await throttler.acquire()
    expect(throttler.available).toBeLessThan(1)
  })

  it('retient les demandes excédentaires jusqu’au refill', async () => {
    vi.useFakeTimers()
    const throttler = new Throttler({ capacity: 1, refillPerInterval: 1, refillIntervalMs: 100 })
    await throttler.acquire()
    const pending = throttler.acquire()
    let resolved = false
    void pending.then(() => {
      resolved = true
    })
    await vi.advanceTimersByTimeAsync(99)
    expect(resolved).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(resolved).toBe(true)
    await pending
  })

  it('sert les waiters dans l’ordre (FIFO)', async () => {
    vi.useFakeTimers()
    const throttler = new Throttler({ capacity: 2, refillPerInterval: 2, refillIntervalMs: 100 })
    await throttler.acquire()
    await throttler.acquire()
    const order: number[] = []
    const waiter = (index: number): void => {
      void throttler.acquire().then(() => {
        order.push(index)
      })
    }
    waiter(1)
    waiter(2)
    waiter(3)
    await vi.advanceTimersByTimeAsync(100)
    expect(order).toEqual([1, 2])
    await vi.advanceTimersByTimeAsync(100)
    expect(order).toEqual([1, 2, 3])
  })

  it('plafonne l’accumulation à la capacité', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(0))
    const throttler = new Throttler({ capacity: 5, refillPerInterval: 1, refillIntervalMs: 10 })
    throttler.acquire().catch(() => undefined)
    vi.setSystemTime(new Date(100_000))
    expect(throttler.available).toBe(5)
  })

  it('dispose rejette les demandes en attente', async () => {
    vi.useFakeTimers()
    const throttler = new Throttler({ capacity: 0, refillPerInterval: 1, refillIntervalMs: 100 })
    const pending = throttler.acquire()
    throttler.dispose()
    await expect(pending).rejects.toThrow('arrêté')
  })

  it('injecte maintenant pour du temps réel', async () => {
    const now = { value: 0 }
    const throttler = new Throttler({
      capacity: 1,
      refillPerInterval: 1,
      refillIntervalMs: 100,
      now: () => now.value
    })
    await throttler.acquire()
    now.value += 250
    await throttler.acquire()
    expect(throttler.available).toBeLessThan(1)
  })
})
import { describe, it, expect } from 'vitest'
import { createRateLimiter, Priority } from '../../src/foundation/rate-limiter.js'

describe('createRateLimiter', () => {
  it('creates a limiter with GMGN config', () => {
    const limiter = createRateLimiter()
    expect(limiter).toHaveProperty('schedule')
    expect(limiter).toHaveProperty('applyPenalty')
    expect(typeof limiter.schedule).toBe('function')
    expect(typeof limiter.applyPenalty).toBe('function')
  })

  it('executes a request through the limiter', async () => {
    const limiter = createRateLimiter()
    const result = await limiter.schedule(
      { weight: 1, priority: Priority.DEFAULT },
      () => Promise.resolve(42),
    )
    expect(result).toBe(42)
  })

  it('high priority drains before default priority', async () => {
    // Use a reservoir of 1 so jobs queue up, then observe execution order
    const limiter = createRateLimiter({
      reservoir: 1,
      reservoirRefreshInterval: 100,
      reservoirRefreshAmount: 1,
      maxQueueDepth: 50,
    })

    const order: string[] = []

    // Consume the single token immediately with a blocking job so the rest queue
    const first = limiter.schedule({ weight: 1, priority: Priority.DEFAULT }, async () => {
      order.push('first')
    })

    // These two queue up while the reservoir is at 0
    const defaultJob = limiter.schedule({ weight: 1, priority: Priority.DEFAULT }, async () => {
      order.push('default')
    })

    const highJob = limiter.schedule({ weight: 1, priority: Priority.HIGH }, async () => {
      order.push('high')
    })

    await Promise.all([first, highJob, defaultJob])

    // 'first' runs immediately; then high-priority should run before default
    expect(order[0]).toBe('first')
    expect(order.indexOf('high')).toBeLessThan(order.indexOf('default'))
  })

  it('rejects when queue exceeds max depth', async () => {
    // maxQueueDepth of 1: the second schedule call should be rejected immediately
    const limiter = createRateLimiter({
      reservoir: 1,
      reservoirRefreshInterval: 200,
      reservoirRefreshAmount: 1,
      maxQueueDepth: 1,
    })

    // Consume the single token so the next job has to queue
    const first = limiter.schedule({ weight: 1, priority: Priority.DEFAULT }, () =>
      Promise.resolve('ok'),
    )

    // This one queues (queueDepth goes to 1, which equals maxQueueDepth)
    // It will resolve once the reservoir refreshes
    const queued = limiter.schedule({ weight: 1, priority: Priority.DEFAULT }, () =>
      Promise.resolve('queued'),
    )

    // This one should be rejected immediately (queueDepth would exceed maxQueueDepth)
    await expect(
      limiter.schedule({ weight: 1, priority: Priority.DEFAULT }, () => Promise.resolve('overflow')),
    ).rejects.toThrow('Queue depth exceeded: too many pending requests')

    // Let pending jobs finish
    await Promise.allSettled([first, queued])
  }, 10000)
})

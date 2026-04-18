import Bottleneck from "bottleneck";

export const Priority = { HIGH: 1, DEFAULT: 5 } as const;

type RateLimiterConfig = {
  reservoir?: number;
  reservoirRefreshInterval?: number;
  reservoirRefreshAmount?: number;
  maxQueueDepth?: number;
};

const GMGN_DEFAULTS: Required<RateLimiterConfig> = {
  reservoir: 10,
  reservoirRefreshInterval: 1000,
  reservoirRefreshAmount: 10,
  maxQueueDepth: 50,
};

type ScheduleOptions = { weight: number; priority: number };

export type RateLimiter = {
  schedule: <T>(options: ScheduleOptions, fn: () => Promise<T>) => Promise<T>;
  applyPenalty: (ms: number) => void;
  getStatus(): "ok" | "rate-limited";
};

export function createRateLimiter(config?: RateLimiterConfig): RateLimiter {
  const opts = { ...GMGN_DEFAULTS, ...config };
  let queueDepth = 0;
  // Tracks the end timestamp of an active penalty window (ms epoch). When
  // `penaltyUntil > Date.now()`, the limiter has drained the reservoir due to a
  // recent 429 and is waiting for the window to expire. Read by getStatus().
  let penaltyUntil: number | null = null;

  const limiter = new Bottleneck({
    reservoir: opts.reservoir,
    reservoirRefreshInterval: opts.reservoirRefreshInterval,
    reservoirRefreshAmount: opts.reservoirRefreshAmount,
    maxConcurrent: null,
  });

  return {
    schedule: async <T>(options: ScheduleOptions, fn: () => Promise<T>): Promise<T> => {
      if (queueDepth >= opts.maxQueueDepth) {
        throw new Error("Queue depth exceeded: too many pending requests");
      }
      queueDepth++;
      try {
        return await limiter.schedule({ weight: options.weight, priority: options.priority }, fn);
      } finally {
        queueDepth--;
      }
    },
    applyPenalty: (ms: number) => {
      penaltyUntil = Date.now() + ms;
      limiter.incrementReservoir(-opts.reservoir);
      setTimeout(() => {
        limiter.incrementReservoir(opts.reservoir);
        // Clear the penalty marker on reservoir restore (if no newer penalty has superseded)
        if (penaltyUntil !== null && Date.now() >= penaltyUntil) {
          penaltyUntil = null;
        }
      }, ms);
    },
    getStatus(): "ok" | "rate-limited" {
      // Active penalty window — definitively rate-limited
      if (penaltyUntil !== null && penaltyUntil > Date.now()) {
        return "rate-limited";
      }
      // Saturation check: queue at maxDepth AND reservoir fully consumed => treat as limited
      const counts = limiter.counts();
      const running = counts.RUNNING ?? 0;
      const queued = counts.QUEUED ?? 0;
      if (queueDepth >= opts.maxQueueDepth && running + queued >= opts.maxQueueDepth) {
        return "rate-limited";
      }
      return "ok";
    },
  };
}

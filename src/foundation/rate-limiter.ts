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
};

export function createRateLimiter(config?: RateLimiterConfig): RateLimiter {
  const opts = { ...GMGN_DEFAULTS, ...config };
  let queueDepth = 0;

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
      limiter.incrementReservoir(-opts.reservoir);
      setTimeout(() => {
        limiter.incrementReservoir(opts.reservoir);
      }, ms);
    },
  };
}

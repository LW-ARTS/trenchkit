import type { GmgnKlineCandle, GmgnRankItem, GmgnTrenchesResponse } from "../api-types.js";
import type { Chain } from "../types.js";
import type { ApiContext } from "./client.js";

export interface MarketApi {
  getTrending(
    chain: Chain,
    options?: { limit?: number; interval?: string },
  ): Promise<GmgnRankItem[]>;
  getTrenches(
    chain: Chain,
    options?: { limit?: number; cursor?: string; filters?: Record<string, string> },
  ): Promise<GmgnTrenchesResponse>;
  getKline(
    chain: Chain,
    address: string,
    options: { resolution: string; from?: number; to?: number; limit?: number },
  ): Promise<GmgnKlineCandle[]>;
}

// Inner envelope returned under the shared `data` field by /v1/market/rank.
// The shared client.ts unwraps the outer envelope once; we unwrap this second
// layer here because only this endpoint double-wraps.
interface GmgnRankInner {
  code?: number;
  data?: { rank?: GmgnRankItem[] };
  message?: string;
  reason?: string;
}

export function createMarketApi(ctx: ApiContext): MarketApi {
  return {
    async getTrending(
      chain: Chain,
      options: { limit?: number; interval?: string } = {},
    ): Promise<GmgnRankItem[]> {
      const params: Record<string, string> = { chain };
      if (options.limit !== undefined) params.limit = String(options.limit);
      if (options.interval !== undefined) params.interval = options.interval;
      const inner = await ctx.request<GmgnRankInner>("GET", "/v1/market/rank", {
        params,
        weight: 1,
      });
      return inner?.data?.rank ?? [];
    },

    getTrenches(
      chain: Chain,
      options: { limit?: number; cursor?: string; filters?: Record<string, string> } = {},
    ): Promise<GmgnTrenchesResponse> {
      const params: Record<string, string> = {};
      if (options.limit !== undefined) params.limit = String(options.limit);
      if (options.cursor !== undefined) params.cursor = options.cursor;
      const body = { chain, ...(options.filters ?? {}) };
      return ctx.request<GmgnTrenchesResponse>("POST", "/v1/trenches", {
        params,
        body,
        weight: 3,
      });
    },

    getKline(
      chain: Chain,
      address: string,
      options: { resolution: string; from?: number; to?: number; limit?: number },
    ): Promise<GmgnKlineCandle[]> {
      const params: Record<string, string> = { chain, address, resolution: options.resolution };
      if (options.from !== undefined) params.from = String(options.from);
      if (options.to !== undefined) params.to = String(options.to);
      if (options.limit !== undefined) params.limit = String(options.limit);
      return ctx.request<GmgnKlineCandle[]>("GET", "/v1/market/token_kline", {
        params,
        weight: 2,
      });
    },
  };
}

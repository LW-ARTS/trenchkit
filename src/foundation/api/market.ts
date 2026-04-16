import type { Chain } from '../types.js';
import type {
  GmgnRankItem,
  GmgnTrenchesResponse,
  GmgnKlineCandle,
} from '../api-types.js';
import type { ApiContext } from './client.js';

export interface MarketApi {
  getTrending(
    chain: Chain,
    options?: { limit?: number; period?: string }
  ): Promise<GmgnRankItem[]>;
  getTrenches(
    chain: Chain,
    options?: { limit?: number; cursor?: string; filters?: Record<string, string> }
  ): Promise<GmgnTrenchesResponse>;
  getKline(
    chain: Chain,
    address: string,
    options: { resolution: string; from?: number; to?: number; limit?: number }
  ): Promise<GmgnKlineCandle[]>;
}

export function createMarketApi(ctx: ApiContext): MarketApi {
  return {
    getTrending(
      chain: Chain,
      options: { limit?: number; period?: string } = {}
    ): Promise<GmgnRankItem[]> {
      const params: Record<string, string> = {};
      if (options.limit !== undefined) params['limit'] = String(options.limit);
      if (options.period !== undefined) params['period'] = options.period;
      return ctx.request<GmgnRankItem[]>('GET', `/api/v1/market/${chain}/trending`, {
        params,
        weight: 1,
      });
    },

    getTrenches(
      chain: Chain,
      options: { limit?: number; cursor?: string; filters?: Record<string, string> } = {}
    ): Promise<GmgnTrenchesResponse> {
      const params: Record<string, string> = {};
      if (options.limit !== undefined) params['limit'] = String(options.limit);
      if (options.cursor !== undefined) params['cursor'] = options.cursor;
      const body = options.filters ?? {};
      return ctx.request<GmgnTrenchesResponse>('POST', `/api/v1/market/${chain}/trenches`, {
        params,
        body,
        weight: 3,
      });
    },

    getKline(
      chain: Chain,
      address: string,
      options: { resolution: string; from?: number; to?: number; limit?: number }
    ): Promise<GmgnKlineCandle[]> {
      const params: Record<string, string> = { resolution: options.resolution };
      if (options.from !== undefined) params['from'] = String(options.from);
      if (options.to !== undefined) params['to'] = String(options.to);
      if (options.limit !== undefined) params['limit'] = String(options.limit);
      return ctx.request<GmgnKlineCandle[]>(
        'GET',
        `/api/v1/market/${chain}/kline/${address}`,
        { params, weight: 2 }
      );
    },
  };
}

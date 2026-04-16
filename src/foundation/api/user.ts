import type { Chain } from '../types.js';
import type {
  GmgnWalletStats,
  GmgnWalletHolding,
  GmgnCreatedTokens,
  GmgnSmartMoneyTrade,
} from '../api-types.js';
import type { ApiContext } from './client.js';

export interface UserApi {
  getWalletStats(chain: Chain, wallet: string, period?: string): Promise<GmgnWalletStats>;
  getWalletHoldings(
    chain: Chain,
    wallet: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<GmgnWalletHolding[]>;
  getWalletActivity(
    chain: Chain,
    wallet: string,
    options?: { limit?: number; cursor?: string; type?: string }
  ): Promise<GmgnSmartMoneyTrade[]>;
  getCreatedTokens(chain: Chain, wallet: string): Promise<GmgnCreatedTokens>;
  getKolTrades(
    chain: Chain,
    options?: { limit?: number; cursor?: string }
  ): Promise<GmgnSmartMoneyTrade[]>;
  getSmartMoneyTrades(
    chain: Chain,
    options?: { limit?: number; cursor?: string }
  ): Promise<GmgnSmartMoneyTrade[]>;
}

export function createUserApi(ctx: ApiContext): UserApi {
  return {
    getWalletStats(
      chain: Chain,
      wallet: string,
      period?: string
    ): Promise<GmgnWalletStats> {
      const params: Record<string, string> = {};
      if (period !== undefined) params['period'] = period;
      return ctx.request<GmgnWalletStats>(
        'GET',
        `/api/v1/user/${chain}/wallet/${wallet}/stats`,
        { params, weight: 3 }
      );
    },

    getWalletHoldings(
      chain: Chain,
      wallet: string,
      options: { limit?: number; cursor?: string } = {}
    ): Promise<GmgnWalletHolding[]> {
      const params: Record<string, string> = {};
      if (options.limit !== undefined) params['limit'] = String(options.limit);
      if (options.cursor !== undefined) params['cursor'] = options.cursor;
      return ctx.request<GmgnWalletHolding[]>(
        'GET',
        `/api/v1/user/${chain}/wallet/${wallet}/holdings`,
        { params, weight: 2 }
      );
    },

    getWalletActivity(
      chain: Chain,
      wallet: string,
      options: { limit?: number; cursor?: string; type?: string } = {}
    ): Promise<GmgnSmartMoneyTrade[]> {
      const params: Record<string, string> = {};
      if (options.limit !== undefined) params['limit'] = String(options.limit);
      if (options.cursor !== undefined) params['cursor'] = options.cursor;
      if (options.type !== undefined) params['type'] = options.type;
      return ctx.request<GmgnSmartMoneyTrade[]>(
        'GET',
        `/api/v1/user/${chain}/wallet/${wallet}/activity`,
        { params, weight: 3 }
      );
    },

    getCreatedTokens(chain: Chain, wallet: string): Promise<GmgnCreatedTokens> {
      return ctx.request<GmgnCreatedTokens>(
        'GET',
        `/api/v1/user/${chain}/wallet/${wallet}/created_tokens`,
        { weight: 2 }
      );
    },

    getKolTrades(
      chain: Chain,
      options: { limit?: number; cursor?: string } = {}
    ): Promise<GmgnSmartMoneyTrade[]> {
      const params: Record<string, string> = {};
      if (options.limit !== undefined) params['limit'] = String(options.limit);
      if (options.cursor !== undefined) params['cursor'] = options.cursor;
      return ctx.request<GmgnSmartMoneyTrade[]>('GET', `/api/v1/user/${chain}/kol_trades`, {
        params,
        weight: 1,
      });
    },

    getSmartMoneyTrades(
      chain: Chain,
      options: { limit?: number; cursor?: string } = {}
    ): Promise<GmgnSmartMoneyTrade[]> {
      const params: Record<string, string> = {};
      if (options.limit !== undefined) params['limit'] = String(options.limit);
      if (options.cursor !== undefined) params['cursor'] = options.cursor;
      return ctx.request<GmgnSmartMoneyTrade[]>(
        'GET',
        `/api/v1/user/${chain}/smart_money_trades`,
        { params, weight: 1 }
      );
    },
  };
}

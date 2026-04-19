import type {
  GmgnCreatedTokens,
  GmgnSmartMoneyTrade,
  GmgnWalletHolding,
  GmgnWalletStats,
} from "../api-types.js";
import type { Chain } from "../types.js";
import type { ApiContext } from "./client.js";

export interface UserApi {
  getWalletStats(chain: Chain, wallet: string, period?: string): Promise<GmgnWalletStats>;
  getWalletHoldings(
    chain: Chain,
    wallet: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<GmgnWalletHolding[]>;
  getWalletActivity(
    chain: Chain,
    wallet: string,
    options?: { limit?: number; cursor?: string; type?: string },
  ): Promise<GmgnSmartMoneyTrade[]>;
  getCreatedTokens(chain: Chain, wallet: string): Promise<GmgnCreatedTokens>;
  getKolTrades(
    chain: Chain,
    options?: { limit?: number; cursor?: string },
  ): Promise<GmgnSmartMoneyTrade[]>;
  getSmartMoneyTrades(
    chain: Chain,
    options?: { limit?: number; cursor?: string },
  ): Promise<GmgnSmartMoneyTrade[]>;
}

export function createUserApi(ctx: ApiContext): UserApi {
  return {
    getWalletStats(chain: Chain, wallet: string, period?: string): Promise<GmgnWalletStats> {
      // GMGN requires `period` — default to 7d when caller didn't specify.
      const params: Record<string, string> = { chain, wallet_address: wallet, period: period ?? "7d" };
      return ctx.request<GmgnWalletStats>("GET", "/v1/user/wallet_stats", {
        params,
        weight: 3,
      });
    },

    getWalletHoldings(
      chain: Chain,
      wallet: string,
      options: { limit?: number; cursor?: string } = {},
    ): Promise<GmgnWalletHolding[]> {
      const params: Record<string, string> = { chain, wallet_address: wallet };
      if (options.limit !== undefined) params.limit = String(options.limit);
      if (options.cursor !== undefined) params.cursor = options.cursor;
      return ctx.request<GmgnWalletHolding[]>("GET", "/v1/user/wallet_holdings", {
        params,
        weight: 2,
      });
    },

    getWalletActivity(
      chain: Chain,
      wallet: string,
      options: { limit?: number; cursor?: string; type?: string } = {},
    ): Promise<GmgnSmartMoneyTrade[]> {
      const params: Record<string, string> = { chain, wallet_address: wallet };
      if (options.limit !== undefined) params.limit = String(options.limit);
      if (options.cursor !== undefined) params.cursor = options.cursor;
      if (options.type !== undefined) params.type = options.type;
      return ctx.request<GmgnSmartMoneyTrade[]>("GET", "/v1/user/wallet_activity", {
        params,
        weight: 3,
      });
    },

    getCreatedTokens(chain: Chain, wallet: string): Promise<GmgnCreatedTokens> {
      return ctx.request<GmgnCreatedTokens>("GET", "/v1/user/created_tokens", {
        params: { chain, wallet_address: wallet },
        weight: 2,
      });
    },

    async getKolTrades(
      chain: Chain,
      options: { limit?: number; cursor?: string } = {},
    ): Promise<GmgnSmartMoneyTrade[]> {
      const params: Record<string, string> = { chain };
      if (options.limit !== undefined) params.limit = String(options.limit);
      if (options.cursor !== undefined) params.cursor = options.cursor;
      const wrapped = await ctx.request<{ list: GmgnSmartMoneyTrade[] } | GmgnSmartMoneyTrade[]>(
        "GET",
        "/v1/user/kol",
        { params, weight: 1 },
      );
      // GMGN returns { list: [...] } for feed endpoints; tolerate plain array for legacy.
      return Array.isArray(wrapped) ? wrapped : (wrapped?.list ?? []);
    },

    async getSmartMoneyTrades(
      chain: Chain,
      options: { limit?: number; cursor?: string } = {},
    ): Promise<GmgnSmartMoneyTrade[]> {
      const params: Record<string, string> = { chain };
      if (options.limit !== undefined) params.limit = String(options.limit);
      if (options.cursor !== undefined) params.cursor = options.cursor;
      const wrapped = await ctx.request<{ list: GmgnSmartMoneyTrade[] } | GmgnSmartMoneyTrade[]>(
        "GET",
        "/v1/user/smartmoney",
        { params, weight: 1 },
      );
      return Array.isArray(wrapped) ? wrapped : (wrapped?.list ?? []);
    },
  };
}

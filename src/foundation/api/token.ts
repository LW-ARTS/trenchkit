import type {
  GmgnHolder,
  GmgnPoolInfo,
  GmgnRankItem,
  GmgnTokenInfo,
  GmgnTokenSecurity,
} from "../api-types.js";
import type { Chain } from "../types.js";
import type { ApiContext } from "./client.js";

export interface TokenApi {
  getInfo(chain: Chain, address: string): Promise<GmgnTokenInfo>;
  getSecurity(chain: Chain, address: string): Promise<GmgnTokenSecurity>;
  getPool(chain: Chain, address: string): Promise<GmgnPoolInfo>;
  getTopHolders(
    chain: Chain,
    address: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<GmgnHolder[]>;
  getTopTraders(
    chain: Chain,
    address: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<GmgnRankItem[]>;
}

export function createTokenApi(ctx: ApiContext): TokenApi {
  return {
    getInfo(chain: Chain, address: string): Promise<GmgnTokenInfo> {
      return ctx.request<GmgnTokenInfo>("GET", `/api/v1/token/${chain}/${address}`, {
        weight: 1,
      });
    },

    getSecurity(chain: Chain, address: string): Promise<GmgnTokenSecurity> {
      return ctx.request<GmgnTokenSecurity>("GET", `/api/v1/token/${chain}/${address}/security`, {
        weight: 1,
      });
    },

    getPool(chain: Chain, address: string): Promise<GmgnPoolInfo> {
      return ctx.request<GmgnPoolInfo>("GET", `/api/v1/token/${chain}/${address}/pool`, {
        weight: 1,
      });
    },

    getTopHolders(
      chain: Chain,
      address: string,
      options: { limit?: number; cursor?: string } = {},
    ): Promise<GmgnHolder[]> {
      const params: Record<string, string> = {};
      if (options.limit !== undefined) params.limit = String(options.limit);
      if (options.cursor !== undefined) params.cursor = options.cursor;
      return ctx.request<GmgnHolder[]>("GET", `/api/v1/token/${chain}/${address}/top_holders`, {
        params,
        weight: 5,
      });
    },

    getTopTraders(
      chain: Chain,
      address: string,
      options: { limit?: number; cursor?: string } = {},
    ): Promise<GmgnRankItem[]> {
      const params: Record<string, string> = {};
      if (options.limit !== undefined) params.limit = String(options.limit);
      if (options.cursor !== undefined) params.cursor = options.cursor;
      return ctx.request<GmgnRankItem[]>("GET", `/api/v1/token/${chain}/${address}/top_traders`, {
        params,
        weight: 5,
      });
    },
  };
}

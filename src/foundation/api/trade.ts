import type {
  GmgnQuoteResponse,
  GmgnStrategyOrder,
  GmgnSwapRequest,
  GmgnSwapResponse,
} from "../api-types.js";
import type { Chain } from "../types.js";
import type { ApiContext } from "./client.js";

export interface TradeApi {
  getQuote(
    chain: Chain,
    from: string,
    inputToken: string,
    outputToken: string,
    amount: string,
    slippage: number,
  ): Promise<GmgnQuoteResponse>;
  submitSwap(chain: Chain, request: GmgnSwapRequest): Promise<GmgnSwapResponse>;
  getOrderStatus(chain: Chain, orderId: string): Promise<GmgnSwapResponse>;
  getStrategyOrders(chain: Chain, walletAddress: string): Promise<GmgnStrategyOrder[]>;
}

export function createTradeApi(ctx: ApiContext): TradeApi {
  return {
    getQuote(chain, from, inputToken, outputToken, amount, slippage) {
      return ctx.request<GmgnQuoteResponse>("GET", "/v1/trade/quote", {
        params: {
          chain,
          from,
          input_token: inputToken,
          output_token: outputToken,
          amount,
          slippage: String(slippage),
        },
        weight: 2,
      });
    },

    submitSwap(chain, request) {
      return ctx.request<GmgnSwapResponse>("POST", "/v1/trade/swap", {
        body: { chain, ...request },
        weight: 3,
        sign: true,
      });
    },

    getOrderStatus(chain, orderId) {
      return ctx.request<GmgnSwapResponse>("GET", "/v1/trade/query_order", {
        params: { chain, order_id: orderId },
        weight: 1,
        sign: true,
      });
    },

    getStrategyOrders(chain, walletAddress) {
      return ctx.request<GmgnStrategyOrder[]>("GET", "/v1/trade/strategy_orders", {
        params: { chain, wallet_address: walletAddress },
        weight: 1,
        sign: true,
      });
    },
  };
}

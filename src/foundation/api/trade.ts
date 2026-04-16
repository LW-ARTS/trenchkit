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
      return ctx.request<GmgnQuoteResponse>("GET", `/api/v1/trade/${chain}/quote`, {
        params: {
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
      return ctx.request<GmgnSwapResponse>("POST", `/api/v1/trade/${chain}/swap`, {
        body: request,
        weight: 3,
        sign: true,
      });
    },

    getOrderStatus(chain, orderId) {
      return ctx.request<GmgnSwapResponse>("GET", `/api/v1/trade/${chain}/order/${orderId}`, {
        weight: 1,
        sign: true,
      });
    },

    getStrategyOrders(chain, walletAddress) {
      return ctx.request<GmgnStrategyOrder[]>("GET", `/api/v1/trade/${chain}/strategy_orders`, {
        params: { wallet: walletAddress },
        weight: 1,
        sign: true,
      });
    },
  };
}

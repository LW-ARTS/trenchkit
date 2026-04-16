import type { Chain } from '../types.js';
import type { GmgnQuoteResponse, GmgnSwapResponse } from '../api-types.js';
import type { ApiContext } from './client.js';

export interface TradeApi {
  getQuote(
    chain: Chain,
    from: string,
    inputToken: string,
    outputToken: string,
    amount: string,
    slippage: number
  ): Promise<GmgnQuoteResponse>;
  submitSwap(
    chain: Chain,
    from: string,
    inputToken: string,
    outputToken: string,
    amount: string,
    slippage: number
  ): Promise<GmgnSwapResponse>;
  getOrderStatus(chain: Chain, orderId: string): Promise<GmgnSwapResponse>;
}

export function createTradeApi(ctx: ApiContext): TradeApi {
  return {
    getQuote(
      chain: Chain,
      from: string,
      inputToken: string,
      outputToken: string,
      amount: string,
      slippage: number
    ): Promise<GmgnQuoteResponse> {
      const params: Record<string, string> = {
        from,
        input_token: inputToken,
        output_token: outputToken,
        amount,
        slippage: String(slippage),
      };
      return ctx.request<GmgnQuoteResponse>('GET', `/api/v1/trade/${chain}/quote`, {
        params,
        weight: 2,
      });
    },

    submitSwap(
      _chain: Chain,
      _from: string,
      _inputToken: string,
      _outputToken: string,
      _amount: string,
      _slippage: number
    ): Promise<GmgnSwapResponse> {
      throw new Error('not yet implemented');
    },

    getOrderStatus(chain: Chain, orderId: string): Promise<GmgnSwapResponse> {
      return ctx.request<GmgnSwapResponse>(
        'GET',
        `/api/v1/trade/${chain}/order/${orderId}`,
        { weight: 1 }
      );
    },
  };
}

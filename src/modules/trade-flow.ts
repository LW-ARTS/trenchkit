import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import type { GmgnClient } from "../foundation/api/client.js";
import { AuthTimestampExpiredError } from "../foundation/api/client.js";
import type {
  GmgnConditionOrder,
  GmgnQuoteResponse,
  GmgnSwapRequest,
  GmgnSwapResponse,
} from "../foundation/api-types.js";
import { getChainConfig } from "../foundation/chain.js";
import type { TrenchkitConfig } from "../foundation/config.js";
import type { Chain } from "../foundation/types.js";

export interface TpSlOptions {
  tpPct?: number; // fixed take-profit, gain %
  slPct?: number; // fixed stop-loss, drop %
  trailTp?: { activationPct: number; callbackPct: number };
  trailSl?: { activationPct: number; callbackPct: number };
}

export interface TradeIntent {
  chain: Chain;
  walletAddress: string;
  inputToken: string;
  outputToken: string;
  amount: string;
  slippage: number; // e.g. 0.02 for 2%
  tpSl?: TpSlOptions;
  priorityFee?: number; // overrides config default
  tipFee?: number; // overrides config default
}

export interface ExecuteOptions {
  yes?: boolean; // skip confirmation
  pollIntervalMs?: number;
  pollMaxMs?: number;
}

export function buildConditionOrders(opts: TpSlOptions): GmgnConditionOrder[] {
  const orders: GmgnConditionOrder[] = [];
  if (opts.tpPct !== undefined) {
    orders.push({ type: "profit_stop", mode: "hold_amount", price_scale: opts.tpPct });
  }
  if (opts.slPct !== undefined) {
    orders.push({ type: "loss_stop", mode: "hold_amount", price_scale: opts.slPct });
  }
  if (opts.trailTp) {
    orders.push({
      type: "profit_stop_trace",
      mode: "hold_amount",
      price_scale: opts.trailTp.activationPct,
      drawdown_rate: opts.trailTp.callbackPct,
    });
  }
  if (opts.trailSl) {
    orders.push({
      type: "loss_stop_trace",
      mode: "hold_amount",
      price_scale: opts.trailSl.activationPct,
      drawdown_rate: opts.trailSl.callbackPct,
    });
  }
  return orders;
}

export function buildSwapRequest(intent: TradeIntent, config: TrenchkitConfig): GmgnSwapRequest {
  const request: GmgnSwapRequest = {
    from: intent.walletAddress,
    input_token: intent.inputToken,
    output_token: intent.outputToken,
    amount: intent.amount,
    slippage: intent.slippage,
  };

  const conditionOrders = intent.tpSl ? buildConditionOrders(intent.tpSl) : [];
  if (conditionOrders.length > 0) {
    request.condition_orders = conditionOrders;

    // SOL requires priority_fee + tip_fee when condition_orders attached,
    // otherwise swap succeeds but strategy creation silently fails.
    if (intent.chain === "sol") {
      request.priority_fee = intent.priorityFee ?? config.defaultPriorityFee;
      request.tip_fee = intent.tipFee ?? config.defaultTipFee;
    }
  }

  return request;
}

export function formatQuotePreview(
  intent: TradeIntent,
  quote: GmgnQuoteResponse,
  tokenSymbol?: string,
): string {
  const native = getChainConfig(intent.chain).nativeCurrency;
  const symbol = tokenSymbol ?? "token";
  const slippagePct = (intent.slippage * 100).toFixed(1);
  const isBuy = intent.inputToken === getChainConfig(intent.chain).nativeAddress;

  if (isBuy) {
    return `Buy ~${quote.output_amount.toLocaleString()} $${symbol} for ${intent.amount} ${native} (slippage: ${slippagePct}%)`;
  }
  return `Sell ${intent.amount} $${symbol} for ~${quote.output_amount} ${native} (slippage: ${slippagePct}%)`;
}

export async function confirmPrompt(line: string): Promise<boolean> {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`${line}\nConfirm? [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

export class MaxTradeAmountExceeded extends Error {
  constructor(requested: number, cap: number) {
    super(
      `Amount ${requested} exceeds configured maxTradeAmount ${cap}. ` +
        `Edit ~/.config/trenchkit/config.json to change the cap.`,
    );
    this.name = "MaxTradeAmountExceeded";
  }
}

export function enforceMaxAmount(intent: TradeIntent, cap: number): void {
  const isBuy = intent.inputToken === getChainConfig(intent.chain).nativeAddress;
  if (!isBuy) return; // cap applies to native-spend buys only
  const requested = parseFloat(intent.amount);
  if (Number.isFinite(requested) && requested > cap) {
    throw new MaxTradeAmountExceeded(requested, cap);
  }
}

export async function pollOrder(
  client: GmgnClient,
  chain: Chain,
  orderId: string,
  opts: { intervalMs?: number; maxMs?: number } = {},
): Promise<GmgnSwapResponse> {
  const intervalMs = opts.intervalMs ?? 2000;
  const maxMs = opts.maxMs ?? 60_000;
  const start = Date.now();

  while (Date.now() - start < maxMs) {
    const status = await client.trade.getOrderStatus(chain, orderId);
    if (status.status === "confirmed" || status.status === "failed") {
      return status;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Order ${orderId} polling timed out after ${maxMs}ms`);
}

export async function executeTrade(
  client: GmgnClient,
  intent: TradeIntent,
  config: TrenchkitConfig,
  options: ExecuteOptions = {},
): Promise<GmgnSwapResponse> {
  // 1. Enforce cap (even when --yes bypasses confirmation).
  enforceMaxAmount(intent, config.maxTradeAmount);

  // 2. Quote preview.
  const quote = await client.trade.getQuote(
    intent.chain,
    intent.walletAddress,
    intent.inputToken,
    intent.outputToken,
    intent.amount,
    intent.slippage,
  );

  // 3. Confirmation (unless --yes).
  if (!options.yes) {
    const preview = formatQuotePreview(intent, quote);
    const ok = await confirmPrompt(preview);
    if (!ok) {
      throw new Error("Trade cancelled by user.");
    }
  }

  // 4. Build + submit swap.
  const request = buildSwapRequest(intent, config);
  let swap: GmgnSwapResponse;
  try {
    swap = await client.trade.submitSwap(intent.chain, request);
  } catch (err) {
    if (err instanceof AuthTimestampExpiredError) {
      // Per spec §13: POST never retried. Order may have executed.
      // Direct user to query_order before any retry to avoid double-spend.
      throw new Error(
        `Trade POST timed out on auth. DO NOT retry. Run 'trenchkit trade orders' ` +
          `to check if the swap executed before resubmitting.`,
      );
    }
    throw err;
  }

  // 5. Poll until confirmed/failed.
  const pollOpts: { intervalMs?: number; maxMs?: number } = {};
  if (options.pollIntervalMs !== undefined) pollOpts.intervalMs = options.pollIntervalMs;
  if (options.pollMaxMs !== undefined) pollOpts.maxMs = options.pollMaxMs;
  return pollOrder(client, intent.chain, swap.order_id, pollOpts);
}

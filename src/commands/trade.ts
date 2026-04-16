import chalk from "chalk";
import Table from "cli-table3";
import type { Command } from "commander";
import { validateAddress } from "../foundation/address.js";
import { createGmgnClient } from "../foundation/api/client.js";
import { getChainConfig, getExplorerTxUrl } from "../foundation/chain.js";
import { hasPrivateKey, loadApiKey, loadConfig } from "../foundation/config.js";
import { truncateAddress } from "../foundation/format.js";
import { brand } from "../foundation/logger.js";
import type { Chain } from "../foundation/types.js";
import { executeTrade, type TpSlOptions, type TradeIntent } from "../modules/trade-flow.js";

const TRADE_DISABLED_MSG =
  "Trade mode requires GMGN_PRIVATE_KEY. Run 'trenchkit init' to configure.\n" +
  "Analysis features work without it.";

function getChain(program: Command): Chain {
  const cfg = loadConfig();
  return (program.opts().chain ?? cfg.defaultChain) as Chain;
}

function requireTradeMode(): string | null {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error(brand.error("No API key found. Run: trenchkit init"));
    return null;
  }
  if (!hasPrivateKey()) {
    console.error(brand.warn(TRADE_DISABLED_MSG));
    return null;
  }
  return apiKey;
}

function resolveWallet(flag: string | undefined): string | null {
  if (flag) return flag;
  return loadConfig().walletAddress ?? null;
}

function parseTpSl(opts: {
  tp?: string;
  sl?: string;
  trailTp?: string;
  trailSl?: string;
}): TpSlOptions | undefined {
  const out: TpSlOptions = {};
  if (opts.tp !== undefined) out.tpPct = parseFloat(opts.tp);
  if (opts.sl !== undefined) out.slPct = parseFloat(opts.sl);
  if (opts.trailTp) {
    const [activation, callback] = opts.trailTp.split(":").map(parseFloat);
    if (activation && callback) out.trailTp = { activationPct: activation, callbackPct: callback };
  }
  if (opts.trailSl) {
    const [activation, callback] = opts.trailSl.split(":").map(parseFloat);
    if (activation && callback) out.trailSl = { activationPct: activation, callbackPct: callback };
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function registerTradeCommand(program: Command): void {
  const trade = program
    .command("trade")
    .description("Execute swaps and strategy orders (requires private key)");

  trade
    .command("buy")
    .description("Buy a token with native currency")
    .argument("<token_address>", "token to buy")
    .requiredOption("--amount <amount>", "amount of native currency to spend")
    .option("--slippage <decimal>", "slippage tolerance (e.g. 0.02)", "0.02")
    .option("--wallet <address>", "source wallet (falls back to config.walletAddress)")
    .option("--tp <pct>", "take-profit gain % (e.g. 150)")
    .option("--sl <pct>", "stop-loss drop % (e.g. 30)")
    .option("--trail-tp <activation:callback>", "trailing TP, e.g. 150:10")
    .option("--trail-sl <activation:callback>", "trailing SL, e.g. 50:10")
    .option("--priority-fee <sol>", "override default priority fee (SOL)")
    .option("--tip-fee <sol>", "override default tip fee (SOL)")
    .option("-y, --yes", "skip confirmation (still enforces maxTradeAmount cap)")
    .action(async (tokenAddress: string, opts: Record<string, string | boolean>) => {
      const apiKey = requireTradeMode();
      if (!apiKey) {
        process.exitCode = 1;
        return;
      }

      const chain = getChain(program);
      if (!validateAddress(chain, tokenAddress)) {
        console.error(brand.error(`Invalid ${chain} address: ${tokenAddress}`));
        process.exitCode = 1;
        return;
      }
      const wallet = resolveWallet(opts.wallet as string | undefined);
      if (!wallet) {
        console.error(
          brand.error("Missing wallet address. Pass --wallet or set walletAddress in config.json"),
        );
        process.exitCode = 1;
        return;
      }

      const native = getChainConfig(chain).nativeAddress;
      const intent: TradeIntent = {
        chain,
        walletAddress: wallet,
        inputToken: native,
        outputToken: tokenAddress,
        amount: opts.amount as string,
        slippage: parseFloat((opts.slippage as string) ?? "0.02"),
      };
      const tpSl = parseTpSl(
        opts as { tp?: string; sl?: string; trailTp?: string; trailSl?: string },
      );
      if (tpSl) intent.tpSl = tpSl;
      if (opts.priorityFee) intent.priorityFee = parseFloat(opts.priorityFee as string);
      if (opts.tipFee) intent.tipFee = parseFloat(opts.tipFee as string);

      await runTrade(apiKey, intent, Boolean(opts.yes));
    });

  trade
    .command("sell")
    .description("Sell a token back to native currency")
    .argument("<token_address>", "token to sell")
    .requiredOption("--percent <pct>", "percent of holdings to sell (1-100)")
    .option("--slippage <decimal>", "slippage tolerance (e.g. 0.02)", "0.02")
    .option("--wallet <address>", "source wallet (falls back to config.walletAddress)")
    .option("-y, --yes", "skip confirmation")
    .action(async (tokenAddress: string, opts: Record<string, string | boolean>) => {
      const apiKey = requireTradeMode();
      if (!apiKey) {
        process.exitCode = 1;
        return;
      }

      const chain = getChain(program);
      if (!validateAddress(chain, tokenAddress)) {
        console.error(brand.error(`Invalid ${chain} address: ${tokenAddress}`));
        process.exitCode = 1;
        return;
      }
      const wallet = resolveWallet(opts.wallet as string | undefined);
      if (!wallet) {
        console.error(
          brand.error("Missing wallet address. Pass --wallet or set walletAddress in config.json"),
        );
        process.exitCode = 1;
        return;
      }

      const percent = parseFloat(opts.percent as string);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        console.error(brand.error("--percent must be between 1 and 100"));
        process.exitCode = 1;
        return;
      }

      try {
        const client = createGmgnClient(apiKey);
        const holdings = await client.user.getWalletHoldings(chain, wallet);
        const position = holdings.find(
          (h) => h.token_address.toLowerCase() === tokenAddress.toLowerCase(),
        );
        if (!position || position.balance <= 0) {
          console.error(
            brand.error(
              `No ${truncateAddress(tokenAddress)} balance found in ${truncateAddress(wallet)}`,
            ),
          );
          process.exitCode = 1;
          return;
        }
        const amount = (position.balance * percent) / 100;

        const native = getChainConfig(chain).nativeAddress;
        const intent: TradeIntent = {
          chain,
          walletAddress: wallet,
          inputToken: tokenAddress,
          outputToken: native,
          amount: amount.toString(),
          slippage: parseFloat((opts.slippage as string) ?? "0.02"),
        };
        await runTrade(apiKey, intent, Boolean(opts.yes));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(brand.error(msg));
        process.exitCode = 1;
      }
    });

  trade
    .command("status")
    .description("Check the status of a submitted order")
    .argument("<order_id>", "order id returned from a prior swap")
    .action(async (orderId: string) => {
      const apiKey = requireTradeMode();
      if (!apiKey) {
        process.exitCode = 1;
        return;
      }
      const chain = getChain(program);
      try {
        const client = createGmgnClient(apiKey);
        const status = await client.trade.getOrderStatus(chain, orderId);
        console.log();
        console.log(chalk.bold.white(`  ORDER ${orderId}`));
        console.log(`  Status: ${chalk.cyan(status.status)}`);
        if (status.tx_hash)
          console.log(`  Tx: ${chalk.dim(getExplorerTxUrl(chain, status.tx_hash))}`);
        if (status.error) console.log(`  Error: ${chalk.red(status.error)}`);
        console.log();
      } catch (err) {
        console.error(brand.error(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    });

  trade
    .command("orders")
    .description("List active TP/SL strategy orders")
    .option("--wallet <address>", "wallet to query (falls back to config.walletAddress)")
    .action(async (opts: { wallet?: string }) => {
      const apiKey = requireTradeMode();
      if (!apiKey) {
        process.exitCode = 1;
        return;
      }
      const chain = getChain(program);
      const wallet = resolveWallet(opts.wallet);
      if (!wallet) {
        console.error(
          brand.error("Missing wallet address. Pass --wallet or set walletAddress in config.json"),
        );
        process.exitCode = 1;
        return;
      }
      try {
        const client = createGmgnClient(apiKey);
        const orders = await client.trade.getStrategyOrders(chain, wallet);
        if (orders.length === 0) {
          console.log(chalk.dim("  No active strategy orders."));
          return;
        }
        const table = new Table({
          head: [
            chalk.bold.white("Order"),
            chalk.bold.white("Token"),
            chalk.bold.white("Type"),
            chalk.bold.white("Trigger"),
            chalk.bold.white("Status"),
          ],
          style: { border: ["dim"], head: [] },
        });
        for (const o of orders) {
          const trigger =
            o.drawdown_rate != null
              ? `${o.price_scale}% / callback ${o.drawdown_rate}%`
              : `${o.price_scale}%`;
          table.push([
            chalk.dim(truncateAddress(o.order_id, 6)),
            chalk.white(truncateAddress(o.token_address, 4)),
            chalk.cyan(o.type),
            chalk.yellow(trigger),
            chalk.green(o.status),
          ]);
        }
        console.log(table.toString());
      } catch (err) {
        console.error(brand.error(err instanceof Error ? err.message : String(err)));
        process.exitCode = 1;
      }
    });
}

async function runTrade(apiKey: string, intent: TradeIntent, yes: boolean): Promise<void> {
  try {
    const client = createGmgnClient(apiKey);
    const config = loadConfig();
    const result = await executeTrade(client, intent, config, { yes });
    console.log();
    console.log(chalk.green(`  Order ${result.order_id}: ${result.status}`));
    if (result.tx_hash) {
      console.log(`  Tx: ${chalk.dim(getExplorerTxUrl(intent.chain, result.tx_hash))}`);
    }
    console.log();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(brand.error(msg));
    process.exitCode = 1;
  }
}

import chalk from "chalk";
import type { Command } from "commander";
import { validateAddress } from "../foundation/address.js";
import { createGmgnClient } from "../foundation/api/client.js";
import { loadApiKey, loadConfig } from "../foundation/config.js";
import { formatPercent, formatUsd, truncateAddress } from "../foundation/format.js";
import { brand, scoreColor } from "../foundation/logger.js";
import type { Chain } from "../foundation/types.js";
import { WalletIntel } from "../modules/wallet-intel.js";

export function registerWalletCommand(program: Command): void {
  program
    .command("wallet")
    .description("Analyze wallet profiles and trading history")
    .argument("<address>", "wallet address to analyze")
    .option("--holdings", "show current token holdings")
    .option("--history", "show recent trade history")
    .action(async (address: string) => {
      const apiKey = loadApiKey();
      if (!apiKey) {
        console.error(brand.error("No API key found. Run: trenchkit init"));
        process.exitCode = 1;
        return;
      }

      const config = loadConfig();
      const chain = (program.opts().chain ?? config.defaultChain) as Chain;

      if (!validateAddress(chain, address)) {
        console.error(brand.error(`Invalid ${chain} address: ${address}`));
        process.exitCode = 1;
        return;
      }

      try {
        const client = createGmgnClient(apiKey);
        const intel = new WalletIntel(client, chain);
        const profile = await intel.getProfile(address);

        const short = truncateAddress(address);
        const totalTrades = (profile.buyCount ?? 0) + (profile.sellCount ?? 0);
        const wins = profile.winRate != null ? Math.round(profile.winRate * totalTrades) : null;

        console.log();
        console.log(brand.header(`  Wallet Profile: ${short}`));
        console.log(chalk.dim(`  ${"─".repeat(44)}`));

        if (profile.winRate != null) {
          const winPct = `${Math.round(profile.winRate * 100)}%`;
          const winsStr = wins != null ? ` (${wins}/${totalTrades} trades)` : "";
          console.log(`  Win Rate:       ${chalk.green(winPct)}${chalk.dim(winsStr)}`);
        }

        if (profile.walletScore != null) {
          const colorFn = scoreColor(profile.walletScore);
          console.log(`  Wallet Score:   ${colorFn(`${profile.walletScore}/100`)}`);
        }

        if (profile.tags && profile.tags.length > 0) {
          const tagStr = profile.tags.join(", ");
          console.log(`  Tags:           ${chalk.cyan(tagStr)}`);
        }

        if (profile.realizedProfit != null) {
          const val = profile.realizedProfit;
          const colored = val >= 0 ? chalk.green(formatUsd(val)) : chalk.red(formatUsd(val));
          console.log(`  Realized P&L:   ${colored}`);
        }

        if (profile.unrealizedProfit != null) {
          const val = profile.unrealizedProfit;
          const colored = val >= 0 ? chalk.green(formatUsd(val)) : chalk.red(formatUsd(val));
          console.log(`  Unrealized P&L: ${colored}`);
        }

        if (profile.avgRoi != null) {
          const colored =
            profile.avgRoi >= 0
              ? chalk.green(formatPercent(profile.avgRoi))
              : chalk.red(formatPercent(profile.avgRoi));
          console.log(`  Avg ROI:        ${colored}`);
        }

        if (profile.style) {
          console.log(`  Style:          ${chalk.white(profile.style)}`);
        }

        if (profile.riskLevel) {
          console.log(`  Risk Level:     ${chalk.white(profile.riskLevel)}`);
        }

        console.log(chalk.dim(`  ${"─".repeat(44)}`));
        console.log(`  ${brand.footer}`);
        console.log();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(brand.error(msg));
        process.exitCode = 1;
      }
    });
}

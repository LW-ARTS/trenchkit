import chalk from "chalk";
import Table from "cli-table3";
import type { Command } from "commander";
import { calculateConviction } from "../engine/scorers/index.js";
import { validateAddress } from "../foundation/address.js";
import { createGmgnClient } from "../foundation/api/client.js";
import { isValidChain } from "../foundation/chain.js";
import { loadApiKey, loadConfig } from "../foundation/config.js";
import { formatPercent, formatUsd, truncateAddress } from "../foundation/format.js";
import { brand, convictionColor, gradeColor } from "../foundation/logger.js";
import type { Chain, TokenAnalysis } from "../foundation/types.js";
import { ResearchEngine } from "../modules/research.js";

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

function buildSecurityDetail(a: TokenAnalysis): string {
  const parts: string[] = [];
  if (a.isRenounced === true || a.isMintAuthorityRenounced === true) parts.push("Renounced");
  if (a.isHoneypot === false) parts.push("No honeypot");
  else if (a.isHoneypot === true) parts.push("HONEYPOT");
  if (a.buyTax != null) parts.push(`Buy tax ${(a.buyTax * 100).toFixed(1)}%`);
  if (a.sellTax != null) parts.push(`Sell tax ${(a.sellTax * 100).toFixed(1)}%`);
  return parts.join(", ") || "N/A";
}

function buildHolderDetail(a: TokenAnalysis): string {
  const parts: string[] = [];
  if (a.top10HolderRate != null) parts.push(`Top10 hold ${(a.top10HolderRate * 100).toFixed(0)}%`);
  if (a.holderCount != null) parts.push(`${a.holderCount.toLocaleString()} holders`);
  if (a.freshWalletRate != null) parts.push(`Fresh ${(a.freshWalletRate * 100).toFixed(0)}%`);
  return parts.join(", ") || "N/A";
}

function buildLiquidityDetail(a: TokenAnalysis): string {
  const parts: string[] = [];
  if (a.liquidity != null) parts.push(formatUsd(a.liquidity));
  if (a.liquidityStable === true) parts.push("stable");
  else if (a.liquidityStable === false) parts.push("volatile");
  return parts.join(", ") || "N/A";
}

function buildDevDetail(a: TokenAnalysis): string {
  const parts: string[] = [];
  if (a.creatorOpenRatio != null)
    parts.push(`${(a.creatorOpenRatio * 100).toFixed(0)}% graduation rate`);
  if (a.devAthMc != null) parts.push(`ATH MC ${formatUsd(a.devAthMc)}`);
  return parts.join(", ") || "N/A";
}

function buildSmartMoneyDetail(a: TokenAnalysis): string {
  const parts: string[] = [];
  if (a.smartMoneyWalletCount != null) parts.push(`${a.smartMoneyWalletCount} SM wallets`);
  if (a.smartMoneyVolumeRatio != null)
    parts.push(`${(a.smartMoneyVolumeRatio * 100).toFixed(0)}% SM volume`);
  if (a.bluechipOwnerPercentage != null)
    parts.push(`${(a.bluechipOwnerPercentage * 100).toFixed(0)}% bluechip`);
  return parts.join(", ") || "N/A";
}

function buildBotDetail(a: TokenAnalysis): string {
  const parts: string[] = [];
  if (a.botDegenRate != null) parts.push(`${(a.botDegenRate * 100).toFixed(0)}% bots`);
  if (a.isWashTrading === true) parts.push("Wash trading detected");
  else if (a.isWashTrading === false) parts.push("Low bot activity");
  if (a.bundlerRate != null) parts.push(`${(a.bundlerRate * 100).toFixed(0)}% bundlers`);
  return parts.join(", ") || "N/A";
}

const DIMENSION_ROWS: Array<{
  label: string;
  key: string;
  detail: (a: TokenAnalysis) => string;
}> = [
  { label: "Security", key: "security", detail: buildSecurityDetail },
  { label: "Holder Quality", key: "holderQuality", detail: buildHolderDetail },
  { label: "Liquidity", key: "liquidity", detail: buildLiquidityDetail },
  { label: "Dev Trust", key: "devTrust", detail: buildDevDetail },
  { label: "Smart Money", key: "smartMoney", detail: buildSmartMoneyDetail },
  { label: "Bot/Manipulation", key: "botManipulation", detail: buildBotDetail },
];

export function registerResearchCommand(program: Command): void {
  program
    .command("research")
    .description("Deep research report on a token address")
    .argument("<token_address>", "token contract address to research")
    .option("--json", "output raw JSON result")
    .action(async (tokenAddress: string, opts: { json?: boolean }) => {
      const apiKey = loadApiKey();
      if (!apiKey) {
        console.error(brand.error("No API key found. Run: trenchkit init"));
        process.exitCode = 1;
        return;
      }

      const config = loadConfig();
      const chainRaw: string = program.opts().chain ?? config.defaultChain;
      if (!isValidChain(chainRaw)) {
        console.error(brand.error(`Invalid chain "${chainRaw}". Valid options: sol, bsc, base`));
        process.exitCode = 1;
        return;
      }
      const chain: Chain = chainRaw;

      if (!validateAddress(chain, tokenAddress)) {
        console.error(brand.error(`Invalid ${chain} address: ${tokenAddress}`));
        process.exitCode = 1;
        return;
      }

      try {
        const client = createGmgnClient(apiKey);
        const engine = new ResearchEngine(client, chain);
        const raw = await engine.research(tokenAddress);
        const result = calculateConviction(raw);

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        const symbol = result.symbol ? `$${result.symbol}` : truncateAddress(tokenAddress, 6);
        const chainLabel = chain.toUpperCase();

        console.log();
        console.log(brand.header(`  RESEARCH REPORT: ${symbol} (${chainLabel})`));

        if (result.marketCap != null || result.liquidity != null || result.age != null) {
          const meta: string[] = [];
          if (result.marketCap != null) meta.push(`MC ${formatUsd(result.marketCap)}`);
          if (result.liquidity != null) meta.push(`Liq ${formatUsd(result.liquidity)}`);
          if (result.volume24h != null) meta.push(`Vol24h ${formatUsd(result.volume24h)}`);
          console.log(chalk.dim(`  ${meta.join("  |  ")}`));
        }

        if (result.partialData) {
          console.log(chalk.yellow("  [partial data - some endpoints unavailable]"));
        }

        console.log();

        const table = new Table({
          head: [
            chalk.bold.white("Dimension"),
            chalk.bold.white("Grade"),
            chalk.bold.white("Score"),
            chalk.bold.white("Detail"),
          ],
          colWidths: [20, 8, 8, 40],
          style: { border: ["dim"], head: [] },
        });

        const scores = result.dimensionScores ?? {};

        for (const row of DIMENSION_ROWS) {
          const score = scores[row.key];
          if (score == null) continue;
          const grade = scoreToGrade(score);
          const colorFn = gradeColor(grade);
          table.push([
            chalk.white(row.label),
            colorFn(grade),
            colorFn(String(Math.round(score))),
            chalk.dim(row.detail(result)),
          ]);
        }

        console.log(table.toString());
        console.log();

        if (result.convictionScore != null && result.convictionLabel != null) {
          const colorFn = convictionColor(result.convictionLabel);
          console.log(
            `  CONVICTION SCORE: ${colorFn(`${result.convictionScore}/100`)} ${colorFn(result.convictionLabel)}`,
          );
        }

        if (result.holderCount != null || result.priceChange5m != null) {
          console.log();
          const extras: string[] = [];
          if (result.holderCount != null)
            extras.push(`Holders: ${result.holderCount.toLocaleString()}`);
          if (result.priceChange5m != null)
            extras.push(`5m change: ${formatPercent(result.priceChange5m)}`);
          if (result.isOnCurve != null) extras.push(`On curve: ${result.isOnCurve ? "yes" : "no"}`);
          console.log(chalk.dim(`  ${extras.join("  |  ")}`));
        }

        console.log(chalk.dim(`  ${"─".repeat(60)}`));
        console.log(`  ${brand.footer}`);
        console.log();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(brand.error(msg));
        process.exitCode = 1;
      }
    });
}

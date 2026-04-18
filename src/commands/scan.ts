import chalk from "chalk";
import Table from "cli-table3";
import type { Command } from "commander";
import { Pipeline } from "../engine/pipeline.js";
import { createGmgnClient } from "../foundation/api/client.js";
import { isValidChain } from "../foundation/chain.js";
import { loadApiKey, loadConfig } from "../foundation/config.js";
import { formatAge, formatScore, formatUsd } from "../foundation/format.js";
import { brand, scoreColor } from "../foundation/logger.js";
import type { Chain, TokenAnalysis } from "../foundation/types.js";

function printTable(tokens: TokenAnalysis[], chain: Chain): void {
  console.log();
  console.log(
    `  ${brand.header("trenchkit scan")} ${chalk.dim("|")} ${chalk.bold(chain.toUpperCase())} ${chalk.dim("|")} ${chalk.white(`${tokens.length} tokens found`)}`,
  );
  console.log();

  const table = new Table({
    head: [
      chalk.dim("#"),
      chalk.dim("Token"),
      chalk.dim("MCap"),
      chalk.dim("Score"),
      chalk.dim("Stage"),
      chalk.dim("Age"),
    ],
    style: {
      head: [],
      border: [],
      compact: false,
    },
    chars: {
      top: "",
      "top-mid": "",
      "top-left": "",
      "top-right": "",
      bottom: "",
      "bottom-mid": "",
      "bottom-left": "",
      "bottom-right": "",
      left: "  ",
      "left-mid": "",
      mid: "",
      "mid-mid": "",
      right: "",
      "right-mid": "",
      middle: "  ",
    },
  });

  tokens.forEach((t, i) => {
    const rank = String(i + 1);
    const symbol = t.symbol != null ? `$${t.symbol}` : chalk.dim("unknown");
    const mcap = t.marketCap != null ? formatUsd(t.marketCap) : chalk.dim("-");
    const score =
      t.convictionScore != null
        ? scoreColor(t.convictionScore)(formatScore(t.convictionScore))
        : chalk.dim("-");
    const stage = t.lifecycleStage != null ? t.lifecycleStage : chalk.dim("-");
    const age = t.age != null ? formatAge(t.age) : chalk.dim("-");

    table.push([rank, symbol, mcap, score, stage, age]);
  });

  console.log(table.toString());
  console.log();
  console.log(`  ${brand.footer}`);
  console.log();
}

async function runScan(chain: Chain, minScore: number | undefined): Promise<void> {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.log(brand.error("No API key found. Run `trenchkit init` to configure."));
    process.exitCode = 1;
    return;
  }

  const client = createGmgnClient(apiKey);
  const pipeline = new Pipeline(client, chain);

  try {
    let tokens: TokenAnalysis[];
    try {
      tokens = await pipeline.scan();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(brand.error(`API error: ${message}`));
      process.exitCode = 1;
      return;
    }

    if (minScore !== undefined) {
      tokens = tokens.filter((t) => t.convictionScore != null && t.convictionScore >= minScore);
    }

    if (tokens.length === 0) {
      console.log();
      console.log(chalk.dim("  No tokens found matching criteria"));
      console.log();
      return;
    }

    printTable(tokens, chain);
  } finally {
    pipeline.dispose();
  }
}

/**
 * Watch-mode loop. Owns a single long-lived Pipeline across all ticks so we do
 * not leak `convergence:detected` listeners on the shared `pipelineEvents`
 * emitter (each `new Pipeline()` registers one). Disposed on SIGINT.
 */
export async function runScanLoop(
  chain: Chain,
  minScore: number | undefined,
  intervalMs = 30_000,
): Promise<void> {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.log(brand.error("No API key found. Run `trenchkit init` to configure."));
    process.exitCode = 1;
    return;
  }

  const client = createGmgnClient(apiKey);
  const pipeline = new Pipeline(client, chain);

  const renderOnce = async (): Promise<void> => {
    let tokens: TokenAnalysis[];
    try {
      tokens = await pipeline.scan();
    } catch (err) {
      // Do NOT tear down the loop on a single-tick API error — log and skip.
      // User can Ctrl-C to stop. This keeps `--watch` resilient across
      // transient rate-limit / network blips.
      const message = err instanceof Error ? err.message : String(err);
      console.log(brand.error(`API error: ${message}`));
      return;
    }

    if (minScore !== undefined) {
      tokens = tokens.filter((t) => t.convictionScore != null && t.convictionScore >= minScore);
    }

    if (tokens.length === 0) {
      console.log();
      console.log(chalk.dim("  No tokens found matching criteria"));
      console.log();
      return;
    }

    printTable(tokens, chain);
  };

  console.clear();
  await renderOnce();

  const interval = setInterval(() => {
    void (async () => {
      console.clear();
      await renderOnce();
    })();
  }, intervalMs);

  process.once("SIGINT", () => {
    clearInterval(interval);
    pipeline.dispose();
    console.log();
    console.log(chalk.dim("  Stopped watching."));
    console.log();
    process.exitCode = 0;
  });
}

export function registerScanCommand(program: Command): void {
  program
    .command("scan")
    .description("Scan trending tokens with conviction scores")
    .option("--trenches", "include launchpad tokens (enabled by default)")
    .option("--chain <chain>", "override default chain (sol, bsc, base)")
    .option("--min-score <n>", "only show tokens with conviction >= n", (v: string) =>
      parseInt(v, 10),
    )
    .option("--watch", "continuous mode: poll every 30s and reprint")
    .action(
      async (
        opts: { trenches?: boolean; chain?: string; minScore?: number; watch?: boolean },
        cmd: Command,
      ) => {
        // Chain resolution: --chain on scan > --chain on parent > config default
        const chainRaw: string =
          opts.chain ?? cmd.parent?.opts().chain ?? loadConfig().defaultChain;
        if (!isValidChain(chainRaw)) {
          console.log(brand.error(`Invalid chain "${chainRaw}". Valid options: sol, bsc, base`));
          process.exitCode = 1;
          return;
        }
        const chain: Chain = chainRaw;
        const minScore: number | undefined =
          opts.minScore !== undefined && !Number.isNaN(opts.minScore) ? opts.minScore : undefined;

        if (opts.watch) {
          await runScanLoop(chain, minScore);
        } else {
          await runScan(chain, minScore);
        }
      },
    );
}

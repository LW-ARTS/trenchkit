import chalk from "chalk";
import type { Command } from "commander";
import { isValidChain } from "../foundation/chain.js";
import { loadConfig, saveConfig } from "../foundation/config.js";
import { brand } from "../foundation/logger.js";

export function registerConfigCommand(program: Command): void {
  const config = program.command("config").description("Read or update trenchkit config");

  config
    .command("show")
    .description("Print the active config (excluding secrets)")
    .action(() => {
      console.log(JSON.stringify(loadConfig(), null, 2));
    });

  config
    .command("set")
    .description("Update a config field")
    .argument("<key>", "chain | wallet | max-amount | priority-fee | tip-fee")
    .argument("<value>", "new value")
    .action((key: string, value: string) => {
      const cfg = loadConfig();
      switch (key) {
        case "chain": {
          if (!isValidChain(value)) {
            console.error(brand.error(`chain must be one of: sol, bsc, base`));
            process.exitCode = 1;
            return;
          }
          cfg.defaultChain = value;
          break;
        }
        case "wallet":
          cfg.walletAddress = value;
          break;
        case "max-amount": {
          const n = parseFloat(value);
          if (!Number.isFinite(n) || n <= 0) {
            console.error(brand.error("max-amount must be a positive number"));
            process.exitCode = 1;
            return;
          }
          cfg.maxTradeAmount = n;
          break;
        }
        case "priority-fee": {
          const n = parseFloat(value);
          if (!Number.isFinite(n) || n < 0) {
            console.error(brand.error("priority-fee must be >= 0"));
            process.exitCode = 1;
            return;
          }
          cfg.defaultPriorityFee = n;
          break;
        }
        case "tip-fee": {
          const n = parseFloat(value);
          if (!Number.isFinite(n) || n < 0) {
            console.error(brand.error("tip-fee must be >= 0"));
            process.exitCode = 1;
            return;
          }
          cfg.defaultTipFee = n;
          break;
        }
        default:
          console.error(brand.error(`unknown key: ${key}`));
          process.exitCode = 1;
          return;
      }
      saveConfig(cfg);
      console.log(chalk.green(`  ${key} = ${value}`));
    });
}

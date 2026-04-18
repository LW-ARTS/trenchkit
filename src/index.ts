import dns from "node:dns";
import { Command } from "commander";
import { registerConfigCommand } from "./commands/config.js";
import { registerInitCommand } from "./commands/init.js";
import { registerResearchCommand } from "./commands/research.js";
import { registerScanCommand } from "./commands/scan.js";
import { registerSmartmoneyCommand } from "./commands/smartmoney.js";
import { registerTradeCommand } from "./commands/trade.js";
import { registerWalletCommand } from "./commands/wallet.js";

// GMGN OpenAPI does not support IPv6 (spec §3). On hosts with a working public
// IPv6 address, Node's default "verbatim" DNS ordering can connect IPv6-first,
// which GMGN rejects — on /v1/* paths with a plain-text error, on /api/v1/*
// paths with a Cloudflare JS challenge (HTTP 403 HTML). Force IPv4-first globally.
dns.setDefaultResultOrder("ipv4first");

const program = new Command();

program
  .name("trenchkit")
  .description("Real-time crypto intelligence pipeline built on GMGN OpenAPI")
  .version("0.1.0")
  .option("-c, --chain <chain>", "blockchain network (sol, bsc, base)", "sol");

registerInitCommand(program);
registerConfigCommand(program);
registerScanCommand(program);
registerWalletCommand(program);
registerSmartmoneyCommand(program);
registerResearchCommand(program);
registerTradeCommand(program);

program.parse();

import type { Command } from "commander";
import { render } from "ink";
import { createGmgnClient } from "../foundation/api/client.js";
import { clearKeyMaterial } from "../foundation/auth.js";
import { showBootBanner } from "../foundation/boot-banner.js";
import { isValidChain } from "../foundation/chain.js";
import { hasPrivateKey, loadApiKey, loadConfig } from "../foundation/config.js";
import { brand } from "../foundation/logger.js";
import type { Chain } from "../foundation/types.js";
import { App } from "../ui/index.js";

/**
 * `trenchkit live` command — boots the real-time TUI dashboard.
 *
 * This file is the ONE allowed Ink importer outside `src/ui/`. The verifier
 * grep in plan 03-03's N3 quarantine check explicitly excludes
 * `src/commands/live.tsx`.
 *
 * Pre-Ink validation order (D-21):
 *   1. isValidChain(chain) — else print error + exitCode=1 + return.
 *   2. process.stdin.isTTY — else print TTY hint + exitCode=1 + return.
 *   3. loadApiKey() non-null — else print init hint + exitCode=1 + return.
 *   4. hasPrivateKey() stored as boolean flag passed to <App>.
 *
 * Teardown (D-15): on Q / SIGINT / SIGTERM, unmount Ink, clearKeyMaterial()
 * in a `finally` (key-lifecycle invariant), belt-and-suspenders cursor restore
 * on unhandledRejection. Never call `process.exit` — preserves async cleanup.
 */
export function registerLiveCommand(program: Command): void {
  program
    .command("live")
    .description("Open the real-time TUI dashboard")
    .option("--chain <chain>", "chain to track (sol, bsc, base)", "sol")
    .action(async (options: { chain: string }) => {
      const chainRaw = options.chain;
      if (!isValidChain(chainRaw)) {
        console.error(brand.error(`Invalid chain "${chainRaw}". Valid options: sol, bsc, base`));
        process.exitCode = 1;
        return;
      }
      const chain: Chain = chainRaw;

      if (!process.stdin.isTTY) {
        console.error(
          brand.error("trenchkit live requires a TTY. Try running directly in your terminal."),
        );
        process.exitCode = 1;
        return;
      }

      const apiKey = loadApiKey();
      if (!apiKey) {
        console.error(brand.error("API key required. Run 'trenchkit init' to configure."));
        process.exitCode = 1;
        return;
      }

      const hasKey = hasPrivateKey();
      const client = createGmgnClient(apiKey);
      const config = loadConfig();

      await showBootBanner();

      const inkApp = render(
        <App chain={chain} client={client} config={config} hasPrivateKey={hasKey} />,
      );

      // Belt-and-suspenders: restore cursor visibility if a reject slips past Ink.
      const rejectionHandler = (): void => {
        process.stdout.write("\x1b[?25h");
      };

      const sigintHandler = (): void => {
        inkApp.unmount();
      };
      const sigtermHandler = (): void => {
        inkApp.unmount();
      };

      process.once("SIGINT", sigintHandler);
      process.once("SIGTERM", sigtermHandler);
      process.once("unhandledRejection", rejectionHandler);

      try {
        await inkApp.waitUntilExit();
      } finally {
        process.off("SIGINT", sigintHandler);
        process.off("SIGTERM", sigtermHandler);
        process.off("unhandledRejection", rejectionHandler);
        clearKeyMaterial();
      }
    });
}

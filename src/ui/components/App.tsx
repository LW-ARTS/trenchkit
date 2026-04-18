import { Box } from "ink";
import type React from "react";
import type { GmgnClient } from "../../foundation/api/client.js";
import type { TrenchkitConfig } from "../../foundation/config.js";
import type { Chain } from "../../foundation/types.js";
import { useKeybinds } from "../hooks/useKeybinds.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { ResearchModal } from "../modals/ResearchModal.js";
import { TradeModal } from "../modals/TradeModal.js";
import { WalletModal } from "../modals/WalletModal.js";
import { FocusProvider } from "../providers/FocusProvider.js";
import { ModalProvider, useModal } from "../providers/ModalProvider.js";
import { PipelineProvider } from "../providers/PipelineProvider.js";
import { Footer } from "./Footer.js";
import { Header } from "./Header.js";
import { PanelGrid } from "./PanelGrid.js";
import { MIN_TERMINAL_COLS, MIN_TERMINAL_ROWS, TooSmallFallback } from "./TooSmallFallback.js";

export type AppProps = {
  chain: Chain;
  client: GmgnClient;
  /**
   * TrenchkitConfig — threaded down to PipelineProvider so the `submitTrade`
   * action has the cap + wallet + fee defaults it needs to build a TradeIntent.
   * Optional because Phase 2 test harnesses mount <App> without it; trade flow
   * throws a clear error if missing when the T-key submit tries to fire.
   */
  config?: TrenchkitConfig;
  hasPrivateKey: boolean;
};

/**
 * Top-level App. Composition:
 *
 *   <PipelineProvider>
 *     <FocusProvider>
 *       <ModalProvider>
 *         <AppShell />   // uses useKeybinds + useTerminalSize
 *       </ModalProvider>
 *     </FocusProvider>
 *   </PipelineProvider>
 *
 * The PipelineProvider owns the Pipeline instance + all interval cadences
 * (locked decision from Phase 2). FocusProvider scopes focus state to this
 * mount; ModalProvider handles the active overlay ID.
 */
export function App(props: AppProps): React.ReactElement {
  // Pass config only when defined — exactOptionalPropertyTypes rejects
  // `config={undefined}` literals on optional props.
  const providerProps =
    props.config !== undefined
      ? { chain: props.chain, client: props.client, config: props.config }
      : { chain: props.chain, client: props.client };
  return (
    <PipelineProvider {...providerProps}>
      <FocusProvider>
        <ModalProvider>
          <AppShell hasPrivateKey={props.hasPrivateKey} />
        </ModalProvider>
      </FocusProvider>
    </PipelineProvider>
  );
}

function AppShell({ hasPrivateKey }: { hasPrivateKey: boolean }): React.ReactElement {
  useKeybinds();
  const { cols, rows } = useTerminalSize();
  const tooSmall = cols < MIN_TERMINAL_COLS || rows < MIN_TERMINAL_ROWS;

  if (tooSmall) return <TooSmallFallback />;

  return (
    <Box flexDirection="column" height="100%">
      <Box height={1}>
        <Header />
      </Box>
      <PanelGrid />
      <Box height={1}>
        <Footer />
      </Box>
      <ActiveModal hasPrivateKey={hasPrivateKey} />
    </Box>
  );
}

/**
 * Renders at most one modal based on ModalProvider state. Dim-backdrop of the
 * grid (D-09) is deferred — the cyan double-border ModalBackdrop is visually
 * dominant for v1. Documented as a minor deviation from D-09 in SUMMARY.
 */
function ActiveModal({ hasPrivateKey }: { hasPrivateKey: boolean }): React.ReactElement | null {
  const { active } = useModal();
  if (active === "wallet") return <WalletModal />;
  if (active === "research") return <ResearchModal />;
  if (active === "trade") return <TradeModal hasPrivateKey={hasPrivateKey} />;
  return null;
}

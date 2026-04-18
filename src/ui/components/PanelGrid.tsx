import { Box } from "ink";
import type React from "react";
import { ConvergencePanel } from "../panels/ConvergencePanel.js";
import { ResearchPanel } from "../panels/ResearchPanel.js";
import { ScannerPanel } from "../panels/ScannerPanel.js";
import { SmartMoneyPanel } from "../panels/SmartMoneyPanel.js";

/**
 * 2×2 panel grid (D-18 equal 50/50). Layout:
 *   TL ScannerPanel   | TR SmartMoneyPanel
 *   BL ConvergencePanel | BR ResearchPanel
 *
 * Each panel self-borders from useFocus() and wraps its own
 * PanelErrorBoundary. No per-panel props needed here.
 */
export function PanelGrid(): React.ReactElement {
  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box flexDirection="row" flexGrow={1}>
        <ScannerPanel />
        <SmartMoneyPanel />
      </Box>
      <Box flexDirection="row" flexGrow={1}>
        <ConvergencePanel />
        <ResearchPanel />
      </Box>
    </Box>
  );
}

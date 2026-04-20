import { Box, Text } from "ink";
import type React from "react";
import { truncateAddress } from "../../foundation/format.js";
import type { SignalStrength } from "../../foundation/types.js";
import type { ConvergenceAlert } from "../../modules/smart-money.js";
import { PanelErrorBoundary } from "../components/PanelErrorBoundary.js";
import { useConvergence } from "../hooks/useConvergence.js";
import { useRowCount } from "../hooks/useRowCount.js";
import { useFocus } from "../providers/FocusProvider.js";

const PANEL_ID = "convergence" as const;

const STRENGTH_COLOR: Record<SignalStrength, string> = {
  WEAK: "gray",
  MEDIUM: "yellow",
  STRONG: "cyan",
  VERY_STRONG: "magenta",
};

/** Derive a SignalStrength label from the numeric `strength` field (0-100). */
function deriveSignalLevel(strength: number): SignalStrength {
  if (strength < 25) return "WEAK";
  if (strength < 50) return "MEDIUM";
  if (strength < 75) return "STRONG";
  return "VERY_STRONG";
}

export function ConvergencePanel(): React.ReactElement {
  const slice = useConvergence();
  const { focusedPanel, selectedRow } = useFocus();
  const rowCount = useRowCount();

  const isFocused = focusedPanel === PANEL_ID;
  const borderStyle = isFocused ? "double" : "round";
  const resetKey = slice.length;

  return (
    <PanelErrorBoundary resetKey={resetKey}>
      <Box
        flexDirection="column"
        borderStyle={borderStyle}
        flexBasis="50%"
        flexGrow={1}
        paddingX={1}
      >
        <Text bold>CONVERGENCE</Text>
        <ConvergenceBody
          slice={slice}
          rowCount={rowCount}
          selectedRow={selectedRow[PANEL_ID]}
          isFocused={isFocused}
        />
      </Box>
    </PanelErrorBoundary>
  );
}

function formatHHMM(unixSeconds: number | undefined): string {
  if (typeof unixSeconds !== "number" || !Number.isFinite(unixSeconds)) return "—    ";
  const d = new Date(unixSeconds * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} `;
}

function ConvergenceBody({
  slice,
  rowCount,
  selectedRow,
  isFocused,
}: {
  slice: ConvergenceAlert[];
  rowCount: number;
  selectedRow: number;
  isFocused: boolean;
}): React.ReactElement {
  if (slice.length === 0) return <Text color="gray">Awaiting convergence</Text>;

  const visible = slice.slice(0, Math.max(0, rowCount));
  return (
    <Box flexDirection="column">
      <Text dimColor>{"Strength     Token        Wallets  Time"}</Text>
      {visible.map((alert, idx) => {
        const selected = isFocused && idx === selectedRow;
        const level: SignalStrength =
          typeof alert.signalLevel === "string"
            ? alert.signalLevel
            : deriveSignalLevel(alert.strength);
        const color = STRENGTH_COLOR[level];
        const levelText = level.padEnd(12).slice(0, 12);
        const token = truncateAddress(alert.tokenAddress, 4).padEnd(12).slice(0, 12);
        const walletsRaw = typeof alert.walletCount === "number" ? alert.walletCount : null;
        const wallets = (walletsRaw === null ? "—" : String(walletsRaw)).padStart(7);
        const time = formatHHMM(alert.detectedAt);
        const key = `${alert.tokenAddress}-${alert.detectedAt ?? idx}`;
        return (
          <Text key={key} inverse={selected}>
            <Text color={color} inverse={selected}>
              {levelText}
            </Text>
            {` ${token} ${wallets}  ${time}`}
          </Text>
        );
      })}
    </Box>
  );
}

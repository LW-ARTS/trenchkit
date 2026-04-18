import { Box, Text } from "ink";
import type React from "react";
import { formatUsd } from "../../foundation/format.js";
import type { TokenAnalysis } from "../../foundation/types.js";
import { PanelErrorBoundary } from "../components/PanelErrorBoundary.js";
import { useRowCount } from "../hooks/useRowCount.js";
import { useScanner } from "../hooks/useScanner.js";
import { useFocus } from "../providers/FocusProvider.js";

const PANEL_ID = "scanner" as const;

export function ScannerPanel(): React.ReactElement {
  const slice = useScanner();
  const { focusedPanel, selectedRow } = useFocus();
  const rowCount = useRowCount();

  const isFocused = focusedPanel === PANEL_ID;
  const borderStyle = isFocused ? "double" : "round";
  const resetKey = slice?.length ?? 0;

  return (
    <PanelErrorBoundary resetKey={resetKey}>
      <Box
        flexDirection="column"
        borderStyle={borderStyle}
        flexBasis="50%"
        flexGrow={1}
        paddingX={1}
      >
        <Text bold>SCANNER</Text>
        <ScannerBody
          slice={slice}
          rowCount={rowCount}
          selectedRow={selectedRow[PANEL_ID]}
          isFocused={isFocused}
        />
      </Box>
    </PanelErrorBoundary>
  );
}

function ScannerBody({
  slice,
  rowCount,
  selectedRow,
  isFocused,
}: {
  slice: TokenAnalysis[] | null;
  rowCount: number;
  selectedRow: number;
  isFocused: boolean;
}): React.ReactElement {
  if (slice === null) return <Text color="gray">scanning…</Text>;
  if (slice.length === 0) return <Text color="gray">No qualified tokens yet</Text>;

  const visible = slice.slice(0, Math.max(0, rowCount));
  return (
    <Box flexDirection="column">
      <Text dimColor>{"Symbol          Score   MC      Liq     Holders"}</Text>
      {visible.map((t, idx) => {
        const selected = isFocused && idx === selectedRow;
        const score = t.convictionScore ?? 0;
        const mc = t.marketCap != null ? formatUsd(t.marketCap) : "—";
        const liq = t.liquidity != null ? formatUsd(t.liquidity) : "—";
        const holders = t.holderCount ?? 0;
        const sym = (t.symbol ?? "$???").padEnd(14).slice(0, 14);
        const scoreStr = String(score).padStart(4);
        const mcStr = mc.padStart(8);
        const liqStr = liq.padStart(8);
        const holdersStr = String(holders).padStart(6);
        return (
          <Text key={t.address} inverse={selected}>
            {`${sym} ${scoreStr}  ${mcStr} ${liqStr} ${holdersStr}`}
          </Text>
        );
      })}
    </Box>
  );
}

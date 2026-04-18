import { Box, Text } from "ink";
import type React from "react";
import { formatUsd, truncateAddress } from "../../foundation/format.js";
import type { NormalizedTrade } from "../../modules/smart-money.js";
import { PanelErrorBoundary } from "../components/PanelErrorBoundary.js";
import { useRowCount } from "../hooks/useRowCount.js";
import { useSmartMoney } from "../hooks/useSmartMoney.js";
import { useFocus } from "../providers/FocusProvider.js";

const PANEL_ID = "smart-money" as const;

export function SmartMoneyPanel(): React.ReactElement {
  const slice = useSmartMoney();
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
        <Text bold>SMART MONEY</Text>
        <SmartMoneyBody slice={slice} rowCount={rowCount} selectedRow={selectedRow[PANEL_ID]} />
      </Box>
    </PanelErrorBoundary>
  );
}

function formatHHMM(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function SmartMoneyBody({
  slice,
  rowCount,
  selectedRow,
}: {
  slice: NormalizedTrade[] | null;
  rowCount: number;
  selectedRow: number;
}): React.ReactElement {
  if (slice === null) return <Text color="gray">listening…</Text>;
  if (slice.length === 0) return <Text color="gray">No smart-money activity</Text>;

  const visible = slice.slice(0, Math.max(0, rowCount));
  return (
    <Box flexDirection="column">
      <Text dimColor>{"Time   Wallet      Source  Side  Size"}</Text>
      {visible.map((t, idx) => {
        const selected = idx === selectedRow;
        const time = formatHHMM(t.timestamp).padEnd(6);
        const wallet = truncateAddress(t.maker, 4).padEnd(11).slice(0, 11);
        const source = (t.source === "kol" ? "KOL" : "SM").padEnd(6);
        const sideText = t.side === "buy" ? "BUY " : "SELL";
        const sideColor = t.side === "buy" ? "green" : "red";
        const size = formatUsd(t.amountUsd).padStart(6);
        const key = `${t.maker}-${t.timestamp}-${idx}`;
        return (
          <Text key={key} inverse={selected}>
            {`${time} ${wallet} ${source} `}
            <Text color={sideColor} inverse={selected}>
              {sideText}
            </Text>
            {` ${size}`}
          </Text>
        );
      })}
    </Box>
  );
}

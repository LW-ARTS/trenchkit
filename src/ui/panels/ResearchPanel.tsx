import { Box, Text } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import { truncateAddress } from "../../foundation/format.js";
import type { ConvictionLabel, TokenAnalysis } from "../../foundation/types.js";
import { PanelErrorBoundary } from "../components/PanelErrorBoundary.js";
import { useResearch } from "../hooks/useResearch.js";
import { useRowCount } from "../hooks/useRowCount.js";
import { useFocus } from "../providers/FocusProvider.js";

const PANEL_ID = "research" as const;
const FEED_CAP = 20;

const CONVICTION_COLOR: Record<ConvictionLabel, string> = {
  HIGH: "green",
  MODERATE: "cyan",
  LOW: "yellow",
  AVOID: "red",
};

type FeedEntry = {
  analysis: TokenAnalysis;
  addedAt: number; // unix seconds
};

export function ResearchPanel(): React.ReactElement {
  const latest = useResearch();
  const { focusedPanel, selectedRow } = useFocus();
  const rowCount = useRowCount();

  const [feed, setFeed] = useState<FeedEntry[]>([]);

  useEffect(() => {
    if (!latest) return;
    setFeed((prev) => {
      const filtered = prev.filter((e) => e.analysis.address !== latest.address);
      const next: FeedEntry[] = [
        { analysis: latest, addedAt: Math.floor(Date.now() / 1000) },
        ...filtered,
      ];
      return next.slice(0, FEED_CAP);
    });
  }, [latest]);

  const isFocused = focusedPanel === PANEL_ID;
  const borderStyle = isFocused ? "double" : "round";
  const resetKey = feed.length;

  return (
    <PanelErrorBoundary resetKey={resetKey}>
      <Box
        flexDirection="column"
        borderStyle={borderStyle}
        flexBasis="50%"
        flexGrow={1}
        paddingX={1}
      >
        <Text bold>RESEARCH</Text>
        <ResearchBody
          feed={feed}
          rowCount={rowCount}
          selectedRow={selectedRow[PANEL_ID]}
          isFocused={isFocused}
        />
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

function ResearchBody({
  feed,
  rowCount,
  selectedRow,
  isFocused,
}: {
  feed: FeedEntry[];
  rowCount: number;
  selectedRow: number;
  isFocused: boolean;
}): React.ReactElement {
  if (feed.length === 0) return <Text color="gray">No recent research</Text>;

  const visible = feed.slice(0, Math.max(0, rowCount));
  return (
    <Box flexDirection="column">
      <Text dimColor>{"Token         Score   Conviction   Time"}</Text>
      {visible.map(({ analysis, addedAt }, idx) => {
        const selected = isFocused && idx === selectedRow;
        const tokenLabel = (analysis.symbol ?? truncateAddress(analysis.address, 4))
          .padEnd(13)
          .slice(0, 13);
        const score = analysis.convictionScore ?? 0;
        const scoreStr = String(score).padStart(4);
        const conviction: ConvictionLabel | null = analysis.convictionLabel;
        const convictionText = (conviction ?? "—").padEnd(11).slice(0, 11);
        const convictionColor = conviction ? CONVICTION_COLOR[conviction] : "gray";
        const time = formatHHMM(addedAt);
        const key = `${analysis.address}-${addedAt}`;
        return (
          <Text key={key} inverse={selected}>
            {`${tokenLabel} ${scoreStr}   `}
            <Text color={convictionColor} inverse={selected}>
              {convictionText}
            </Text>
            {`  ${time}`}
          </Text>
        );
      })}
    </Box>
  );
}

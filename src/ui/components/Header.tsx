import { Box, Text } from "ink";
import type React from "react";
import { getChainConfig } from "../../foundation/chain.js";
import { useChain } from "../hooks/useChain.js";
import { useRateLimitStatus } from "../hooks/useRateLimitStatus.js";
import { HeaderClock } from "./HeaderClock.js";

export function Header(): React.ReactElement {
  const chain = useChain();
  const status = useRateLimitStatus();
  const { displayLabel } = getChainConfig(chain);

  const statusColor = status === "ok" ? "green" : "yellow";
  const statusLabel = status === "ok" ? "• ok" : "• rate-limited";

  return (
    <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
      <Text bold>{displayLabel}</Text>
      <HeaderClock />
      <Text color={statusColor}>{statusLabel}</Text>
    </Box>
  );
}

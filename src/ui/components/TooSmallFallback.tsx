import { Box, Text } from "ink";
import type React from "react";
import { useTerminalSize } from "../hooks/useTerminalSize.js";

const MIN_COLS = 100;
const MIN_ROWS = 30;

/**
 * D-13: Centered fallback when the terminal is smaller than 100×30. Re-renders
 * on SIGWINCH via `useTerminalSize()` so the user sees live dims drop/grow.
 */
export function TooSmallFallback(): React.ReactElement {
  const { cols, rows } = useTerminalSize();
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
      <Text>{`Please resize terminal to at least ${MIN_COLS}×${MIN_ROWS}`}</Text>
      <Text dimColor>{`(current: ${cols}×${rows})`}</Text>
    </Box>
  );
}

export const MIN_TERMINAL_COLS = MIN_COLS;
export const MIN_TERMINAL_ROWS = MIN_ROWS;

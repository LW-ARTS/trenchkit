import { useTerminalSize } from "./useTerminalSize.js";

// Reserve for Header (1) + Footer (1)
const CHROME_ROWS = 2;
// Each panel: top border (1) + column header (1) + bottom border (1)
const PANEL_CHROME = 3;
// 2x2 grid — each panel gets half the middle area
const GRID_ROWS = 2;

/**
 * Compute the visible data-row capacity of a single panel given current
 * terminal height. Returns the max number of rows a panel may render via
 * `slice.slice(0, rowCount)` per D-19 (silent truncation).
 *
 * Returns 0 when the terminal is below the minimum viable height.
 */
export function useRowCount(): number {
  const { rows } = useTerminalSize();
  const middleRows = Math.max(0, rows - CHROME_ROWS);
  const perPanel = Math.floor(middleRows / GRID_ROWS);
  const dataRows = Math.max(0, perPanel - PANEL_CHROME);
  return dataRows;
}

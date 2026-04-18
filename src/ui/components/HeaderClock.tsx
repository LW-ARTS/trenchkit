import { Text } from "ink";
import type React from "react";
import { memo } from "react";
import { useClock } from "../hooks/useClock.js";

function formatClock(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export const HeaderClock: React.FC = memo(function HeaderClock() {
  const clock = useClock();
  return <Text>{formatClock(clock)}</Text>;
});

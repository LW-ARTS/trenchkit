import { useContext } from "react";
import { ClockContext } from "../providers/PipelineProvider.js";

export function useClock(): Date {
  const value = useContext(ClockContext);
  if (value === null) {
    throw new Error("useClock must be used inside PipelineProvider");
  }
  return value;
}

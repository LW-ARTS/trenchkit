import { useContext } from "react";
import { RateLimitStatusContext } from "../providers/PipelineProvider.js";

export function useRateLimitStatus(): "ok" | "rate-limited" {
  const value = useContext(RateLimitStatusContext);
  if (value === null) {
    throw new Error("useRateLimitStatus must be used inside PipelineProvider");
  }
  return value;
}

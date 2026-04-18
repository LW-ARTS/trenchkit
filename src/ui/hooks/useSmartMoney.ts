import { useContext } from "react";
import type { NormalizedTrade } from "../../modules/smart-money.js";
import { SmartMoneyContext } from "../providers/PipelineProvider.js";

export function useSmartMoney(): NormalizedTrade[] | null {
  const value = useContext(SmartMoneyContext);
  if (value === undefined) {
    throw new Error("useSmartMoney must be used inside PipelineProvider");
  }
  return value;
}

import { useContext } from "react";
import type { ConvergenceAlert } from "../../modules/smart-money.js";
import { ConvergenceContext } from "../providers/PipelineProvider.js";

export function useConvergence(): ConvergenceAlert[] {
  const value = useContext(ConvergenceContext);
  if (value === null) {
    throw new Error("useConvergence must be used inside PipelineProvider");
  }
  return value;
}

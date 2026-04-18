import { useContext } from "react";
import type { TokenAnalysis } from "../../foundation/types.js";
import { ResearchContext } from "../providers/PipelineProvider.js";

export function useResearch(): TokenAnalysis | null {
  const value = useContext(ResearchContext);
  if (value === undefined) {
    throw new Error("useResearch must be used inside PipelineProvider");
  }
  return value;
}

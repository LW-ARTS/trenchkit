import { useContext } from "react";
import type { TokenAnalysis } from "../../foundation/types.js";
import { ScannerContext } from "../providers/PipelineProvider.js";

export function useScanner(): TokenAnalysis[] | null {
  const value = useContext(ScannerContext);
  if (value === undefined) {
    throw new Error("useScanner must be used inside PipelineProvider");
  }
  return value;
}

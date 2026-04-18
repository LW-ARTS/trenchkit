import { useContext } from "react";
import type { Chain } from "../../foundation/types.js";
import { ChainContext } from "../providers/PipelineProvider.js";

export function useChain(): Chain {
  const value = useContext(ChainContext);
  if (value === null) {
    throw new Error("useChain must be used inside PipelineProvider");
  }
  return value;
}

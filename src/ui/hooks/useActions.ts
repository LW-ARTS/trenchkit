import { useContext } from "react";
import { ActionsContext, type PipelineContextValue } from "../providers/PipelineProvider.js";

export type Actions = PipelineContextValue["actions"];

export function useActions(): Actions {
  const value = useContext(ActionsContext);
  if (value === null) {
    throw new Error("useActions must be used inside PipelineProvider");
  }
  return value;
}

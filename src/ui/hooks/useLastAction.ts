import { useContext } from "react";
import { LastActionContext } from "../providers/PipelineProvider.js";

export function useLastAction(): string | null {
  return useContext(LastActionContext);
}

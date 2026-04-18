import { useStdout } from "ink";
import { useEffect, useState } from "react";

export type TerminalSize = {
  cols: number;
  rows: number;
};

/**
 * Live terminal dimensions hook. Subscribes to Node's `process.stdout.on("resize")`
 * via Ink's `useStdout()`. Returns current `{cols, rows}` and updates on SIGWINCH.
 */
export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();
  const [size, setSize] = useState<TerminalSize>(() => ({
    cols: stdout.columns ?? 80,
    rows: stdout.rows ?? 24,
  }));

  useEffect(() => {
    const handleResize = (): void => {
      setSize({
        cols: stdout.columns ?? 80,
        rows: stdout.rows ?? 24,
      });
    };
    stdout.on("resize", handleResize);
    return () => {
      stdout.off("resize", handleResize);
    };
  }, [stdout]);

  return size;
}

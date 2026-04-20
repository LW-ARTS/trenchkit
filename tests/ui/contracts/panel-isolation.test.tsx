import { Box } from "ink";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PanelErrorBoundary } from "../../../src/ui/components/PanelErrorBoundary.js";
import { ConvergencePanel } from "../../../src/ui/panels/ConvergencePanel.js";
import { ResearchPanel } from "../../../src/ui/panels/ResearchPanel.js";
import { SmartMoneyPanel } from "../../../src/ui/panels/SmartMoneyPanel.js";
import { renderWithShell } from "../helpers.js";

/**
 * Contract lock: — panel error isolation.
 *
 * Locks the PanelErrorBoundary composition against regression:
 * a single panel throwing MUST render ErrorBox in ITS cell and leave the
 * other 3 panels rendering their loading/empty states.
 *
 * Strategy: replace ScannerPanel with a test-only ThrowingPanel wrapped in
 * PanelErrorBoundary; render a 2x2 grid mirroring the real PanelGrid shape.
 * Assert lastFrame contains BOTH the ErrorBox marker AND identifying content
 * from each of the 3 surviving panels.
 */

function ThrowingPanel(): React.ReactElement {
  throw new Error("flagship test crash");
}

describe("contract: panel error isolation", () => {
  beforeEach(() => {
    // React 19's error boundary machinery logs the caught throw to
    // console.error twice (once for the throw, once for the componentStack).
    // Silence so test output stays clean. The PanelErrorBoundary itself also
    // console.error's intentionally; test coverage is behavioral, not log-based.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("isolates a crashed panel from the other 3", () => {
    const { lastFrame } = renderWithShell({
      children: (
        <Box flexDirection="column">
          <Box flexDirection="row">
            <PanelErrorBoundary>
              <ThrowingPanel />
            </PanelErrorBoundary>
            <SmartMoneyPanel />
          </Box>
          <Box flexDirection="row">
            <ConvergencePanel />
            <ResearchPanel />
          </Box>
        </Box>
      ),
    });

    const frame = lastFrame() ?? "";

    // ErrorBox marker + truncated message from the ThrowingPanel cell.
    expect(frame).toContain("⚠ panel unavailable");
    expect(frame).toContain("flagship test crash");

    // Surviving panels render their loading/empty state strings.
    // NOTE: the real source strings — the plan text is partly wrong, these
    // are what ScannerPanel/SmartMoneyPanel/ConvergencePanel/ResearchPanel
    // actually emit under the MockPipelineProvider defaults (null slices).
    expect(frame).toContain("listening"); // SmartMoneyPanel loading ("listening…")
    expect(frame).toContain("Awaiting convergence"); // ConvergencePanel empty
    expect(frame).toContain("No recent research"); // ResearchPanel empty
  });

  it("ErrorBox resets when resetKey changes", () => {
    // Mount with resetKey=0 and a throwing child; confirm boundary catches.
    // Then rerender with resetKey=1 and a non-throwing child; confirm boundary
    // clears and renders the child instead of the cached ErrorBox.
    const Ok = () => <Box />;
    const { lastFrame, rerender } = renderWithShell({
      children: (
        <PanelErrorBoundary resetKey={0}>
          <ThrowingPanel />
        </PanelErrorBoundary>
      ),
    });
    expect(lastFrame() ?? "").toContain("⚠ panel unavailable");

    rerender(
      <PanelErrorBoundary resetKey={1}>
        <Ok />
      </PanelErrorBoundary>,
    );
    // After resetKey change, boundary clears — ErrorBox marker gone.
    expect(lastFrame() ?? "").not.toContain("⚠ panel unavailable");
  });
});

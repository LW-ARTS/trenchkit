import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PanelErrorBoundary } from "../../../src/ui/components/PanelErrorBoundary.js";

function Thrower({ message = "boom" }: { message?: string }): React.ReactElement {
  throw new Error(message);
}

describe("PanelErrorBoundary", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("renders children on happy path", () => {
    const { lastFrame } = render(
      <PanelErrorBoundary>
        <Text>hello</Text>
      </PanelErrorBoundary>,
    );
    expect(lastFrame() ?? "").toContain("hello");
  });

  it("catches thrown child and renders ErrorBox with the message", () => {
    const { lastFrame } = render(
      <PanelErrorBoundary>
        <Thrower message="boom" />
      </PanelErrorBoundary>,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("⚠ panel unavailable");
    expect(frame).toContain("boom");
  });

  it("isolates side-by-side boundaries — one crashes, other renders", () => {
    const { lastFrame } = render(
      <Box flexDirection="row">
        <PanelErrorBoundary>
          <Thrower message="left panel error" />
        </PanelErrorBoundary>
        <PanelErrorBoundary>
          <Text>ok</Text>
        </PanelErrorBoundary>
      </Box>,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("⚠ panel unavailable");
    expect(frame).toContain("left panel error");
    expect(frame).toContain("ok");
  });

  it("does NOT render stack trace in the UI — routes to console.error", () => {
    const { lastFrame } = render(
      <PanelErrorBoundary>
        <Thrower message="boom" />
      </PanelErrorBoundary>,
    );
    const frame = lastFrame() ?? "";
    expect(frame).not.toContain("at Thrower");
    expect(frame).not.toContain("Component stack");
    expect(frame).not.toContain("at render");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("resets error state when resetKey changes", () => {
    const { lastFrame, rerender } = render(
      <PanelErrorBoundary resetKey={1}>
        <Thrower message="first error" />
      </PanelErrorBoundary>,
    );
    expect(lastFrame() ?? "").toContain("⚠ panel unavailable");

    rerender(
      <PanelErrorBoundary resetKey={2}>
        <Text>recovered</Text>
      </PanelErrorBoundary>,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("recovered");
    expect(frame).not.toContain("⚠ panel unavailable");
  });

  it("stays sticky when resetKey is not provided", () => {
    const { lastFrame, rerender } = render(
      <PanelErrorBoundary>
        <Thrower message="first error" />
      </PanelErrorBoundary>,
    );
    expect(lastFrame() ?? "").toContain("⚠ panel unavailable");

    rerender(
      <PanelErrorBoundary>
        <Text>should not recover</Text>
      </PanelErrorBoundary>,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("⚠ panel unavailable");
    expect(frame).not.toContain("should not recover");
  });
});

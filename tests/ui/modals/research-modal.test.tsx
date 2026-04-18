import type React from "react";
import { describe, expect, it } from "vitest";
import { ResearchModal } from "../../../src/ui/modals/ResearchModal.js";
import { ModalProvider } from "../../../src/ui/providers/ModalProvider.js";
import { flushFrame, renderWithPipeline } from "../helpers.js";

function wrap(children: React.ReactElement): React.ReactElement {
  return <ModalProvider>{children}</ModalProvider>;
}

describe("ResearchModal", () => {
  it("renders title and prompt", () => {
    const { lastFrame } = renderWithPipeline({
      chain: "sol",
      children: wrap(<ResearchModal />),
    });
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Token Research");
    expect(frame).toContain("Enter token address");
    expect(frame).toContain("Chain: sol");
  });

  it("shows error on invalid token address + Enter", async () => {
    const { stdin, lastFrame } = renderWithPipeline({
      chain: "sol",
      children: wrap(<ResearchModal />),
    });
    stdin.write("bad");
    await flushFrame();
    stdin.write("\r");
    await flushFrame();
    const frame = lastFrame() ?? "";
    expect(frame.toLowerCase()).toContain("invalid");
  });

  it("accepts a valid SOL token address + closes", async () => {
    const { stdin, lastFrame } = renderWithPipeline({
      chain: "sol",
      children: wrap(<ResearchModal />),
    });
    stdin.write("So11111111111111111111111111111111111111112");
    await flushFrame();
    stdin.write("\r");
    await flushFrame();
    const frame = lastFrame() ?? "";
    expect(frame.toLowerCase()).not.toContain("invalid");
  });
});

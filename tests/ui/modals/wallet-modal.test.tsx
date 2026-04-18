import type React from "react";
import { describe, expect, it } from "vitest";
import { WalletModal } from "../../../src/ui/modals/WalletModal.js";
import { ModalProvider } from "../../../src/ui/providers/ModalProvider.js";
import { flushFrame, renderWithPipeline } from "../helpers.js";

function wrap(children: React.ReactElement): React.ReactElement {
  return <ModalProvider>{children}</ModalProvider>;
}

describe("WalletModal", () => {
  it("renders title and prompt", () => {
    const { lastFrame } = renderWithPipeline({
      chain: "sol",
      children: wrap(<WalletModal />),
    });
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Wallet Lookup");
    expect(frame).toContain("Enter wallet address");
    expect(frame).toContain("Chain: sol");
  });

  it("shows error on invalid address + Enter", async () => {
    const { stdin, lastFrame } = renderWithPipeline({
      chain: "sol",
      children: wrap(<WalletModal />),
    });
    // Only ASCII letters — no shell metachars, but not valid Base58 (too short).
    stdin.write("bad");
    await flushFrame();
    stdin.write("\r");
    await flushFrame();
    const frame = lastFrame() ?? "";
    expect(frame.toLowerCase()).toContain("invalid");
  });

  it("accepts a valid SOL address", async () => {
    const { stdin, lastFrame } = renderWithPipeline({
      chain: "sol",
      children: wrap(<WalletModal />),
    });
    // Valid Solana base58 address (32 chars)
    stdin.write("So11111111111111111111111111111111111111112");
    await flushFrame();
    stdin.write("\r");
    await flushFrame();
    const frame = lastFrame() ?? "";
    // On valid, close() is called — modal stops rendering. Frame should not
    // contain the "Invalid" error.
    expect(frame.toLowerCase()).not.toContain("invalid");
  });
});

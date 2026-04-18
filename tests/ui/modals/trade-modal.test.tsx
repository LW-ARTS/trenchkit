import type React from "react";
import { describe, expect, it } from "vitest";
import { TradeModal } from "../../../src/ui/modals/TradeModal.js";
import { ModalProvider } from "../../../src/ui/providers/ModalProvider.js";
import { renderWithPipeline } from "../helpers.js";

function wrap(children: React.ReactElement): React.ReactElement {
  return <ModalProvider>{children}</ModalProvider>;
}

describe("TradeModal", () => {
  it("hasPrivateKey=false renders the GMGN_PRIVATE_KEY hint", () => {
    const { lastFrame } = renderWithPipeline({
      chain: "sol",
      children: wrap(<TradeModal hasPrivateKey={false} />),
    });
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Set GMGN_PRIVATE_KEY");
    expect(frame.toLowerCase()).toContain("escape");
  });

  it("hasPrivateKey=true opens on the token address stage", () => {
    const { lastFrame } = renderWithPipeline({
      chain: "sol",
      children: wrap(<TradeModal hasPrivateKey={true} />),
    });
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Trade");
    expect(frame).toContain("Enter token address");
    // confirm + amount stages not shown yet
    expect(frame).not.toContain("Execute trade?");
    expect(frame).not.toContain("Enter amount");
  });
});

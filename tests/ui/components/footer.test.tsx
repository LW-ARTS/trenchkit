import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { ATTRIBUTION, Footer } from "../../../src/ui/components/Footer.js";

describe("Footer", () => {
  it("renders the attribution constant", () => {
    const { lastFrame } = render(<Footer />);
    expect(lastFrame() ?? "").toContain("built by @LWARTSS | powered by GMGN OpenAPI");
  });

  it("exported ATTRIBUTION matches rendered text", () => {
    const { lastFrame } = render(<Footer />);
    expect(lastFrame() ?? "").toContain(ATTRIBUTION);
  });

  it("does not render keybind hints ", () => {
    const { lastFrame } = render(<Footer />);
    const frame = lastFrame() ?? "";
    // legacy no-keybind-hint scope predated the routing wire-up
    expect(frame).not.toContain("S·W·R·T·Q");
    expect(frame).not.toContain("[S]");
    expect(frame).not.toContain("press Q");
  });
});

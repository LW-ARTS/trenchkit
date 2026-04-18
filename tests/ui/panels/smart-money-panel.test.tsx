import { describe, expect, it } from "vitest";
import type { NormalizedTrade } from "../../../src/modules/smart-money.js";
import { SmartMoneyPanel } from "../../../src/ui/panels/SmartMoneyPanel.js";
import { renderWithShell } from "../helpers.js";

function makeTrade(overrides: Partial<NormalizedTrade> = {}): NormalizedTrade {
  return {
    maker: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    makerName: null,
    side: "buy",
    amountUsd: 3_200,
    isFullOpen: false,
    timestamp: Math.floor(new Date(Date.UTC(2026, 3, 17, 14, 32)).getTime() / 1000),
    source: "smartmoney",
    ...overrides,
  };
}

describe("SmartMoneyPanel", () => {
  it("renders loading state when slice is null", () => {
    const { lastFrame } = renderWithShell({
      initialSmartMoney: null,
      children: <SmartMoneyPanel />,
    });
    expect(lastFrame() ?? "").toContain("listening");
  });

  it("renders empty state when slice is empty", () => {
    const { lastFrame } = renderWithShell({
      initialSmartMoney: [],
      children: <SmartMoneyPanel />,
    });
    expect(lastFrame() ?? "").toContain("No smart-money activity");
  });

  it("renders trade rows with side label and time", () => {
    const trades: NormalizedTrade[] = [makeTrade({ side: "buy" }), makeTrade({ side: "sell" })];
    const { lastFrame } = renderWithShell({
      initialSmartMoney: trades,
      children: <SmartMoneyPanel />,
    });
    const frame = lastFrame() ?? "";
    expect(frame).toContain("SMART MONEY");
    expect(frame).toContain("BUY");
    expect(frame).toContain("SELL");
    expect(frame).toContain("14:32");
  });

  it("includes column header row", () => {
    const trades: NormalizedTrade[] = [makeTrade()];
    const { lastFrame } = renderWithShell({
      initialSmartMoney: trades,
      children: <SmartMoneyPanel />,
    });
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Time");
    expect(frame).toContain("Wallet");
    expect(frame).toContain("Side");
  });
});

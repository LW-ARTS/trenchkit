import { describe, expect, it } from "vitest";
import { validateAddress } from "../../src/foundation/address.js";

describe("validateAddress", () => {
  it("accepts valid Solana base58 address", () => {
    expect(validateAddress("sol", "So11111111111111111111111111111111111111112")).toBe(true);
    expect(validateAddress("sol", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe(true);
  });

  it("rejects invalid Solana address", () => {
    expect(validateAddress("sol", "0x123")).toBe(false);
    expect(validateAddress("sol", "")).toBe(false);
    expect(validateAddress("sol", "too-short")).toBe(false);
    expect(validateAddress("sol", "has spaces in it")).toBe(false);
    expect(validateAddress("sol", "has;semicolons")).toBe(false);
  });

  it("accepts valid EVM hex address", () => {
    expect(validateAddress("bsc", "0x0000000000000000000000000000000000000000")).toBe(true);
    expect(validateAddress("base", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")).toBe(true);
  });

  it("rejects invalid EVM address", () => {
    expect(validateAddress("bsc", "So11111111111111111111111111111111111111112")).toBe(false);
    expect(validateAddress("bsc", "0x123")).toBe(false);
    expect(validateAddress("base", "")).toBe(false);
  });

  it("rejects addresses with shell metacharacters", () => {
    expect(validateAddress("sol", "abc$(whoami)def")).toBe(false);
    expect(validateAddress("bsc", "0x123|cat /etc/passwd")).toBe(false);
    expect(validateAddress("sol", "key'OR'1=1")).toBe(false);
  });
});

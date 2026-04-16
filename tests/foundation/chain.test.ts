import { describe, expect, it } from "vitest";
import { CHAINS, getChainConfig, getExplorerTxUrl } from "../../src/foundation/chain.js";

describe("CHAINS config", () => {
  it("defines all 3 chains", () => {
    expect(CHAINS.sol).toBeDefined();
    expect(CHAINS.bsc).toBeDefined();
    expect(CHAINS.base).toBeDefined();
  });

  it("SOL config has decimals 9", () => {
    expect(CHAINS.sol.nativeDecimals).toBe(9);
  });

  it("SOL config has freezeAuthority true", () => {
    expect(CHAINS.sol.applicableSecurityFields.freezeAuthority).toBe(true);
  });

  it("SOL config has mintAuthority true", () => {
    expect(CHAINS.sol.applicableSecurityFields.mintAuthority).toBe(true);
  });

  it("SOL config has honeypot false", () => {
    expect(CHAINS.sol.applicableSecurityFields.honeypot).toBe(false);
  });

  it("BSC config has decimals 18", () => {
    expect(CHAINS.bsc.nativeDecimals).toBe(18);
  });

  it("BSC config has honeypot true", () => {
    expect(CHAINS.bsc.applicableSecurityFields.honeypot).toBe(true);
  });

  it("BSC config has freezeAuthority false", () => {
    expect(CHAINS.bsc.applicableSecurityFields.freezeAuthority).toBe(false);
  });

  it("Base config has explorerUrl containing basescan.org", () => {
    expect(CHAINS.base.explorerUrl).toContain("basescan.org");
  });
});

describe("getChainConfig", () => {
  it("returns the correct config for sol", () => {
    const config = getChainConfig("sol");
    expect(config.id).toBe("sol");
    expect(config.nativeDecimals).toBe(9);
  });

  it("returns the correct config for bsc", () => {
    const config = getChainConfig("bsc");
    expect(config.id).toBe("bsc");
    expect(config.nativeDecimals).toBe(18);
  });

  it("returns the correct config for base", () => {
    const config = getChainConfig("base");
    expect(config.id).toBe("base");
    expect(config.explorerUrl).toContain("basescan.org");
  });
});

describe("getExplorerTxUrl", () => {
  it("builds correct SOL explorer URL", () => {
    const url = getExplorerTxUrl("sol", "abc123");
    expect(url).toBe("https://solscan.io/tx/abc123");
  });

  it("builds correct BSC explorer URL", () => {
    const url = getExplorerTxUrl("bsc", "0xdeadbeef");
    expect(url).toBe("https://bscscan.com/tx/0xdeadbeef");
  });

  it("builds correct Base explorer URL", () => {
    const url = getExplorerTxUrl("base", "0xcafebabe");
    expect(url).toBe("https://basescan.org/tx/0xcafebabe");
  });
});

import { getChainConfig } from "../../foundation/chain.js";
import type { TokenAnalysis } from "../../foundation/types.js";

export function scoreSecurityDimension(analysis: TokenAnalysis): number {
  const config = getChainConfig(analysis.chain);
  const fields = config.applicableSecurityFields;

  const inputs = [
    analysis.isRenounced,
    analysis.rugRatio,
    analysis.burnRatio,
    fields.honeypot ? analysis.isHoneypot : null,
    fields.freezeAuthority ? analysis.isFreezeAuthorityRenounced : null,
    fields.mintAuthority ? analysis.isMintAuthorityRenounced : null,
    fields.buyTax ? analysis.buyTax : null,
    fields.sellTax ? analysis.sellTax : null,
  ];
  // No security data at all = unknown, not safe.
  if (inputs.every((v) => v === null)) return Number.NaN;

  // Honeypot = instant kill (EVM only)
  if (fields.honeypot && analysis.isHoneypot === true) return 0;

  let base = 100;

  if (analysis.isRenounced === false) base -= 30;

  // SOL-specific: freeze and mint authority
  if (fields.freezeAuthority && analysis.isFreezeAuthorityRenounced === false) base -= 15;
  if (fields.mintAuthority && analysis.isMintAuthorityRenounced === false) base -= 25;

  // EVM-specific: buy/sell tax
  if (fields.buyTax && analysis.buyTax !== null && analysis.buyTax > 0.05) {
    base -= analysis.buyTax * 200; // 5% tax = -10 points
  }
  if (fields.sellTax && analysis.sellTax !== null && analysis.sellTax > 0.05) {
    base -= analysis.sellTax * 300; // sell tax penalized more
  }

  // Universal
  if (analysis.rugRatio !== null && analysis.rugRatio > 0.3) {
    base -= analysis.rugRatio * 60;
  }
  if (analysis.burnRatio !== null && analysis.burnRatio > 0) {
    base += 10;
  }

  return Math.max(0, Math.min(100, base));
}

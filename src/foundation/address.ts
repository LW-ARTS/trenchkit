import type { Chain } from "./types.js";

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_HEX_REGEX = /^0x[0-9a-fA-F]{40}$/;
const SHELL_METACHAR_REGEX = /[;|&$`\\'"<>(){}!\s]/;

export function validateAddress(chain: Chain, address: string): boolean {
  if (!address || SHELL_METACHAR_REGEX.test(address)) return false;
  if (chain === "sol") return BASE58_REGEX.test(address);
  return EVM_HEX_REGEX.test(address);
}

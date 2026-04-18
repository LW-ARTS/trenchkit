import type { ConvergenceAlert } from "../../modules/smart-money.js";

export const MAX_CONVERGENCE = 20;

/**
 * Push a convergence alert into the ring buffer (newest-first, deduped by tokenAddress).
 *
 * Pure function — returns a NEW array; never mutates the input. Callers hold onto
 * their previous reference safely (verified by immutability test).
 *
 * Ordering: index 0 = newest; existing entry for the same tokenAddress is removed
 * before the fresh alert is prepended (latest strength wins). Length capped at
 * MAX_CONVERGENCE (20) — oldest entries truncated from the tail.
 */
export function pushConvergence(
  buffer: readonly ConvergenceAlert[],
  alert: ConvergenceAlert,
): ConvergenceAlert[] {
  const deduped = buffer.filter((entry) => entry.tokenAddress !== alert.tokenAddress);
  const next = [alert, ...deduped];
  return next.slice(0, MAX_CONVERGENCE);
}

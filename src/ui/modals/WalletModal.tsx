import { Text } from "ink";
import type React from "react";
import { useState } from "react";
import { validateAddress } from "../../foundation/address.js";
import { ModalBackdrop } from "../components/ModalBackdrop.js";
import { TextInput } from "../components/TextInput.js";
import { useChain } from "../hooks/useChain.js";
import { useModal } from "../providers/ModalProvider.js";

/**
 * Wallet-lookup modal (W key, D-10). Validates address via
 * `validateAddress(chain, value)` (returns boolean; shows red error line on
 * invalid). Submit on valid currently just closes — wallet-research wiring
 * lives in plan 03-03 when `useActions().requestWalletResearch` lands.
 */
export function WalletModal(): React.ReactElement {
  const chain = useChain();
  const { close } = useModal();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (value: string): void => {
    if (!validateAddress(chain, value)) {
      setError(`Invalid ${chain} address`);
      return;
    }
    // TODO(plan 03-03): wire wallet research action via useActions().
    // For now: close modal — the Research panel will eventually surface output.
    close();
  };

  return (
    <ModalBackdrop>
      <Text bold>Wallet Lookup</Text>
      <Text dimColor>{`Chain: ${chain}`}</Text>
      <Text> </Text>
      <Text>{"> Enter wallet address"}</Text>
      <TextInput onSubmit={handleSubmit} onCancel={close} placeholder="paste address" />
      {error ? <Text color="red">{error}</Text> : null}
      <Text> </Text>
      <Text dimColor>{"Enter = submit  Escape = cancel"}</Text>
    </ModalBackdrop>
  );
}

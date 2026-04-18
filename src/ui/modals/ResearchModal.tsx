import { Text } from "ink";
import type React from "react";
import { useState } from "react";
import { validateAddress } from "../../foundation/address.js";
import { ModalBackdrop } from "../components/ModalBackdrop.js";
import { TextInput } from "../components/TextInput.js";
import { useActions } from "../hooks/useActions.js";
import { useChain } from "../hooks/useChain.js";
import { useModal } from "../providers/ModalProvider.js";

/**
 * Token-research modal (R key, D-10). Validates input as a token address for
 * the active chain. On valid: fires actions.requestResearch(value) (fire &
 * forget — research result will appear in the Research panel via the slice
 * Context when the `research:complete` event fires). Closes immediately.
 */
export function ResearchModal(): React.ReactElement {
  const chain = useChain();
  const { close } = useModal();
  const actions = useActions();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (value: string): void => {
    if (!validateAddress(chain, value)) {
      setError(`Invalid ${chain} address`);
      return;
    }
    // Fire & forget — pipeline will emit research:complete which the slice
    // consumer (ResearchPanel) picks up through the Context.
    void actions.requestResearch(value);
    close();
  };

  return (
    <ModalBackdrop>
      <Text bold>Token Research</Text>
      <Text dimColor>{`Chain: ${chain}`}</Text>
      <Text> </Text>
      <Text>{"> Enter token address"}</Text>
      <TextInput onSubmit={handleSubmit} onCancel={close} placeholder="paste token address" />
      {error ? <Text color="red">{error}</Text> : null}
      <Text> </Text>
      <Text dimColor>{"Enter = submit  Escape = cancel"}</Text>
    </ModalBackdrop>
  );
}

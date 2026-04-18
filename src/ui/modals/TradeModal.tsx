import { Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";
import { validateAddress } from "../../foundation/address.js";
import { ModalBackdrop } from "../components/ModalBackdrop.js";
import { TextInput } from "../components/TextInput.js";
import { useChain } from "../hooks/useChain.js";
import { useModal } from "../providers/ModalProvider.js";

export type TradeModalProps = {
  hasPrivateKey: boolean;
};

type Stage = "token" | "amount" | "confirm" | "done";

/**
 * Trade modal (T key).
 *
 * - D-11 (hasPrivateKey=false): centered hint to set GMGN_PRIVATE_KEY + Escape.
 * - D-12 (hasPrivateKey=true): three-stage flow token → amount → confirm.
 *
 * The actual `executeTrade()` call is STUBBED for this plan — plan 03-03 wires
 * it via props threaded from live.ts (which owns the GmgnClient instance and
 * validated config). Here we collect the intent, display it, and close on
 * confirm. This lets plan 03-02 ship the keyboard layer + modal layout
 * without coupling to the execution wiring.
 */
export function TradeModal({ hasPrivateKey }: TradeModalProps): React.ReactElement {
  const chain = useChain();
  const { close } = useModal();
  const [stage, setStage] = useState<Stage>("token");
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  if (!hasPrivateKey) {
    return (
      <ModalBackdrop>
        <Text bold>Trade</Text>
        <Text> </Text>
        <Text>Set GMGN_PRIVATE_KEY to enable trading.</Text>
        <Text dimColor>Run: trenchkit init --with-trading</Text>
        <Text> </Text>
        <Text dimColor>Press Escape to dismiss</Text>
        <EscapeDismiss onCancel={close} />
      </ModalBackdrop>
    );
  }

  const handleTokenSubmit = (value: string): void => {
    if (!validateAddress(chain, value)) {
      setError(`Invalid ${chain} token address`);
      return;
    }
    setError(null);
    setTokenAddress(value);
    setStage("amount");
  };

  const handleAmountSubmit = (value: string): void => {
    const num = Number.parseFloat(value);
    if (!Number.isFinite(num) || num <= 0) {
      setError("Amount must be a positive number");
      return;
    }
    setError(null);
    setAmount(value);
    setStage("confirm");
  };

  const handleConfirmSubmit = (value: string): void => {
    // Treat 'y'/'Y'/'yes' as confirm, anything else cancels.
    if (/^y(es)?$/i.test(value.trim())) {
      // TODO(plan 03-03): wire executeTrade(client, intent, config, { prompt })
      // with the GmgnClient + TrenchkitConfig threaded from live.ts.
      setStage("done");
      close();
    } else {
      close();
    }
  };

  return (
    <ModalBackdrop>
      <Text bold>Trade</Text>
      <Text dimColor>{`Chain: ${chain}`}</Text>
      <Text> </Text>
      {stage === "token" ? (
        <>
          <Text>{"> Enter token address"}</Text>
          <TextInput
            onSubmit={handleTokenSubmit}
            onCancel={close}
            placeholder="paste token address"
          />
        </>
      ) : null}
      {stage === "amount" ? (
        <>
          <Text dimColor>{`Token: ${tokenAddress}`}</Text>
          <Text>{"> Enter amount (native units)"}</Text>
          <TextInput onSubmit={handleAmountSubmit} onCancel={close} placeholder="e.g. 0.1" />
        </>
      ) : null}
      {stage === "confirm" ? (
        <>
          <Text dimColor>{`Token:  ${tokenAddress}`}</Text>
          <Text dimColor>{`Amount: ${amount}`}</Text>
          <Text> </Text>
          <Text>{"Execute trade? (y/n)"}</Text>
          <TextInput onSubmit={handleConfirmSubmit} onCancel={close} placeholder="y" />
        </>
      ) : null}
      {error ? <Text color="red">{error}</Text> : null}
      <Text> </Text>
      <Text dimColor>{"Enter = submit  Escape = cancel"}</Text>
    </ModalBackdrop>
  );
}

/**
 * Escape-only handler for the hasPrivateKey=false branch: registers a single
 * useInput that closes on Escape. Renders nothing — no cursor artifact, no
 * hidden keystroke accumulation like a TextInput would introduce.
 */
function EscapeDismiss({ onCancel }: { onCancel: () => void }): null {
  useInput((_input, key) => {
    if (key.escape) onCancel();
  });
  return null;
}

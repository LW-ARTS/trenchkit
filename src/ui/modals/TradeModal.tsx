import { Text, useInput } from "ink";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { validateAddress } from "../../foundation/address.js";
import { getChainConfig } from "../../foundation/chain.js";
import type { TradeIntent } from "../../modules/trade-flow.js";
import { ModalBackdrop } from "../components/ModalBackdrop.js";
import { TextInput } from "../components/TextInput.js";
import { useActions } from "../hooks/useActions.js";
import { useChain } from "../hooks/useChain.js";
import { useModal } from "../providers/ModalProvider.js";

export type TradeModalProps = {
  hasPrivateKey: boolean;
};

type Stage = "token" | "amount" | "confirm" | "submitting" | "result";

/**
 * Trade modal (T key).
 *
 * - D-11 (hasPrivateKey=false): centered hint to set GMGN_PRIVATE_KEY + Escape.
 * - D-12 (hasPrivateKey=true): three-stage flow token → amount → confirm,
 *   followed by submitting → result.
 *
 * On confirm, calls actions.submitTrade (wired to executeTrade in
 * PipelineProvider). The modal has already taken the user through the
 * 3-stage flow so the injected `prompt` resolves true immediately — the
 * modal IS the confirmation. On success: show tx hash + auto-close after
 * 2s. On error: show message; Escape to dismiss.
 */
export function TradeModal({ hasPrivateKey }: TradeModalProps): React.ReactElement {
  const chain = useChain();
  const { close } = useModal();
  const actions = useActions();
  const [stage, setStage] = useState<Stage>("token");
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const mountedRef = useRef<boolean>(true);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      mountedRef.current = false;
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    },
    [],
  );

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
    if (!/^y(es)?$/i.test(value.trim())) {
      close();
      return;
    }
    // Build TradeIntent + dispatch submitTrade. The PipelineProvider's
    // submitTrade action passes prompt=true (modal IS the confirmation) and
    // reads the walletAddress + fee defaults from TrenchkitConfig.
    const native = getChainConfig(chain).nativeAddress;
    // walletAddress is filled in by submitTrade from config.walletAddress;
    // pass "" here as a sentinel — submitTrade throws if not resolvable.
    const intent: TradeIntent = {
      chain,
      walletAddress: "",
      inputToken: native,
      outputToken: tokenAddress,
      amount,
      slippage: 0.02,
    };
    setStage("submitting");
    setError(null);
    void (async () => {
      try {
        const outcome = await actions.submitTrade(intent);
        if (!mountedRef.current) return;
        setResult({
          ok: true,
          message: outcome.tx_hash
            ? `Submitted: ${outcome.tx_hash}`
            : `Order ${outcome.order_id}: ${outcome.status}`,
        });
        setStage("result");
        closeTimeoutRef.current = setTimeout(() => {
          closeTimeoutRef.current = null;
          if (mountedRef.current) close();
        }, 2000);
      } catch (err) {
        if (!mountedRef.current) return;
        setResult({
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        });
        setStage("result");
      }
    })();
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
      {stage === "submitting" ? (
        <>
          <Text dimColor>{`Token:  ${tokenAddress}`}</Text>
          <Text dimColor>{`Amount: ${amount}`}</Text>
          <Text> </Text>
          <Text color="cyan">{"Submitting trade..."}</Text>
        </>
      ) : null}
      {stage === "result" && result !== null ? (
        <>
          <Text dimColor>{`Token:  ${tokenAddress}`}</Text>
          <Text dimColor>{`Amount: ${amount}`}</Text>
          <Text> </Text>
          {result.ok ? (
            <Text color="green">{result.message}</Text>
          ) : (
            <Text color="red">{result.message}</Text>
          )}
          {!result.ok ? <EscapeDismiss onCancel={close} /> : null}
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

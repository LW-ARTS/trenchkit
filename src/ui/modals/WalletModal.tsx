import { Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";
import { validateAddress } from "../../foundation/address.js";
import type { GmgnWalletStats } from "../../foundation/api-types.js";
import { formatUsd, truncateAddress } from "../../foundation/format.js";
import { ModalBackdrop } from "../components/ModalBackdrop.js";
import { TextInput } from "../components/TextInput.js";
import { useActions } from "../hooks/useActions.js";
import { useChain } from "../hooks/useChain.js";
import { useModal } from "../providers/ModalProvider.js";

type Stage = "input" | "loading" | "result" | "error";

export function WalletModal(): React.ReactElement {
  const chain = useChain();
  const { close } = useModal();
  const actions = useActions();
  const [stage, setStage] = useState<Stage>("input");
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string>("");
  const [stats, setStats] = useState<GmgnWalletStats | null>(null);

  // Allow Escape to close modal in any stage except "input" (TextInput already handles Escape).
  useInput(
    (_input, key) => {
      if (key.escape) close();
    },
    { isActive: stage !== "input" },
  );

  const handleSubmit = async (value: string): Promise<void> => {
    if (!validateAddress(chain, value)) {
      setError(`Invalid ${chain} address`);
      return;
    }
    setAddress(value);
    setStage("loading");
    try {
      const result = await actions.lookupWallet(value);
      setStats(result);
      setStage("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage("error");
    }
  };

  return (
    <ModalBackdrop>
      <Text bold>Wallet Lookup</Text>
      <Text dimColor>{`Chain: ${chain}`}</Text>
      <Text> </Text>
      {stage === "input" ? (
        <>
          <Text>{"> Enter wallet address"}</Text>
          <TextInput
            onSubmit={(v) => {
              void handleSubmit(v);
            }}
            onCancel={close}
            placeholder="paste address"
          />
          {error ? <Text color="red">{error}</Text> : null}
        </>
      ) : null}
      {stage === "loading" ? (
        <Text color="cyan">Looking up {truncateAddress(address)}…</Text>
      ) : null}
      {stage === "result" && stats ? (
        <>
          <Text>
            <Text bold>Wallet: </Text>
            {truncateAddress(address)}
          </Text>
          <Text>
            <Text dimColor>Realized P&L (7d): </Text>
            <Text color={(stats.realized_profit ?? 0) >= 0 ? "green" : "red"}>
              {formatUsd(stats.realized_profit ?? 0)}
            </Text>
          </Text>
          <Text>
            <Text dimColor>Unrealized P&L: </Text>
            <Text color={(stats.unrealized_profit ?? 0) >= 0 ? "green" : "red"}>
              {formatUsd(stats.unrealized_profit ?? 0)}
            </Text>
          </Text>
          <Text>
            <Text dimColor>Win rate: </Text>
            {stats.win_rate != null ? `${(Number(stats.win_rate) * 100).toFixed(1)}%` : "—"}
          </Text>
          <Text>
            <Text dimColor>Buys/Sells: </Text>
            {`${stats.buy_count ?? 0} / ${stats.sell_count ?? 0}`}
          </Text>
        </>
      ) : null}
      {stage === "error" ? <Text color="red">✗ {error ?? "Lookup failed"}</Text> : null}
      <Text> </Text>
      <Text dimColor>
        {stage === "input" ? "Enter = submit  Escape = cancel" : "Escape = close"}
      </Text>
    </ModalBackdrop>
  );
}

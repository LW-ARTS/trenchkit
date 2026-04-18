import { Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";

export type TextInputProps = {
  onSubmit: (value: string) => void;
  onCancel?: () => void;
  placeholder?: string;
};

/**
 * Minimal Ink text input.
 *
 * Supports:
 * - typed chars (including multi-char paste input)
 * - backspace / delete
 * - Escape cancels (calls onCancel)
 * - Enter submits (calls onSubmit with current value)
 *
 * Only one TextInput may be mounted at a time — Ink's useInput is global-ish
 * and multiple active handlers can both receive input. Parent (modal) is
 * responsible for mounting only one at a time.
 */
export function TextInput({
  onSubmit,
  onCancel,
  placeholder = "",
}: TextInputProps): React.ReactElement {
  const [value, setValue] = useState("");

  useInput((input, key) => {
    if (key.escape) {
      onCancel?.();
      return;
    }
    if (key.return) {
      onSubmit(value);
      return;
    }
    if (key.backspace || key.delete) {
      setValue((prev) => prev.slice(0, -1));
      return;
    }
    // Ignore modifier-only keypresses and tab (tab is used for focus routing).
    if (!key.ctrl && !key.meta && !key.tab && input.length > 0) {
      setValue((prev) => prev + input);
    }
  });

  const display = value.length === 0 ? placeholder : value;
  if (value.length === 0) {
    return <Text color="gray">{`${display}█`}</Text>;
  }
  return <Text>{`${display}█`}</Text>;
}

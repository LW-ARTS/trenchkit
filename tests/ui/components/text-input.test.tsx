import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { TextInput } from "../../../src/ui/components/TextInput.js";
import { flushFrame } from "../helpers.js";

describe("TextInput", () => {
  it("renders the placeholder when empty", () => {
    const onSubmit = vi.fn();
    const { lastFrame } = render(<TextInput onSubmit={onSubmit} placeholder="paste address" />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("paste address");
    // cursor block rendered
    expect(frame).toContain("█");
  });

  it("accumulates typed characters and submits on Enter", async () => {
    const onSubmit = vi.fn();
    const { stdin, lastFrame } = render(<TextInput onSubmit={onSubmit} />);
    stdin.write("abc");
    await flushFrame();
    expect(lastFrame() ?? "").toContain("abc");
    stdin.write("\r"); // Enter
    await flushFrame();
    expect(onSubmit).toHaveBeenCalledWith("abc");
  });

  it("backspace removes the last character", async () => {
    const onSubmit = vi.fn();
    const { stdin, lastFrame } = render(<TextInput onSubmit={onSubmit} />);
    stdin.write("abc");
    await flushFrame();
    stdin.write("\u007f"); // Backspace (DEL)
    await flushFrame();
    expect(lastFrame() ?? "").toContain("ab");
    stdin.write("\r");
    await flushFrame();
    expect(onSubmit).toHaveBeenCalledWith("ab");
  });

  it("Escape calls onCancel", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const { stdin } = render(<TextInput onSubmit={onSubmit} onCancel={onCancel} />);
    stdin.write("\u001b"); // ESC
    // Ink's input parser buffers a lone ESC byte for 20ms in case a longer
    // escape sequence follows (CSI etc.). We wait past that flush timer.
    await new Promise((r) => setTimeout(r, 40));
    await flushFrame();
    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

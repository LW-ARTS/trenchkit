import { afterEach } from "vitest";
import { pipelineEvents } from "../../src/foundation/events.js";

// TUI-07c: every test file runs this cleanup automatically after each `it()`.
// Prevents cross-test event contamination + MaxListenersExceededWarning in CI
// output when PipelineProvider mounts leave listeners behind on the singleton
// `pipelineEvents` emitter.
//
// Registered globally via vitest.config.ts `test.setupFiles`. The foundation
// and engine suites do NOT register listeners that must persist across `it()`
// blocks (verified via `grep pipelineEvents.on tests/`), so a global afterEach
// on the singleton is safe even outside tests/ui/.
afterEach(() => {
  pipelineEvents.removeAllListeners();
});

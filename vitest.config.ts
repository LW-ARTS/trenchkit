import { defineConfig } from "vitest/config";

// Minimal Vitest config. The test-lock milestone
// (test-lock) introduces a global `afterEach` cleanup on the pipelineEvents
// singleton to prevent cross-test listener contamination + MaxListenersExceeded
// warnings when PipelineProvider mounts leave residual subscribers.
export default defineConfig({
  test: {
    setupFiles: ["./tests/ui/setup.ts"],
  },
});

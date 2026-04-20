import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  splitting: false,
  treeshake: true,
  minify: true,
  sourcemap: false,
  dts: false,
  clean: true,
  shims: false,
  banner: { js: "#!/usr/bin/env node" },
});

import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    environment: "happy-dom",
  },
  staged: {
    "*": "vp check --fix",
  },
  pack: {
    entry: ["src/index.ts", "src/web/index.ts", "src/httpapi/index.ts"],
    format: ["esm"],
    dts: {
      tsgo: true,
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});

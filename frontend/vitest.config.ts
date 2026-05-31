import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@contract": resolve(__dirname, "types/contract.ts"),
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});

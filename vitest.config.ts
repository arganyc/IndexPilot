import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": dirname,
      "server-only": path.join(dirname, "tests/server-only.ts"),
    },
  },
  test: {
    testTimeout: 10000,
  },
});

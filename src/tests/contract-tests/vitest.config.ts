import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["src/tests/contract-tests/consumer", "src/tests/contract-tests/provider"],
  },
});

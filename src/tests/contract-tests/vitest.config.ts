import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["src/tests/contract-tests/consumer", "src/tests/contract-tests/provider"],
    bail: 1,
    retry: {
      // Retry to get around comms issues between PACT RUST server and JS client
      count: 2,
      delay: 50,
    },
  },
});

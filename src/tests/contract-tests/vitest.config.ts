import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configurationDirectory = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    projects: [`${configurationDirectory}consumer`, `${configurationDirectory}provider`],
    bail: 1,
  },
});

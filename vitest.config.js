import { defineConfig } from "vitest/config";

export default defineConfig({
  assetsInclude: ["**/*.njk"],
  plugins: [
    {
      name: "nunjucks-raw-loader",
      transform(code, id) {
        if (id.endsWith(".njk")) {
          return {
            // Export the absolute path (id) as a string
            code: `export default ${JSON.stringify(id)};`,
            map: null,
          };
        }
      },
    },
  ],
  test: {
    exclude: ["**/node_modules/**", "**/.git/**", "src/tests/contract-tests"],
    setupFiles: ["setup-vitest.ts"],
    coverage: {
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
    },
  },
});

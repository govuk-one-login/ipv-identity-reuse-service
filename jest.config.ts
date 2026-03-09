import type { Config } from "jest";

const config: Config = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  reporters: ["default"],
  setupFiles: ["./setup-jest.ts"],
  testPathIgnorePatterns: ["pact\\.(test|spec)"],
  transformIgnorePatterns: ["node_modules/(?!jose/)"],
  transform: {
    "^.+\\.[tj]sx?$": ["ts-jest", { tsconfig: { allowJs: true } }],
  },
};

export default config;

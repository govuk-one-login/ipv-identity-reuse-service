import type { Config } from "jest";

const config: Config = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  reporters: ["default"],
  setupFiles: ["./setup-jest.ts"],
  transform: {
    "^.+\\.[jt]sx?$": ["ts-jest", { tsconfig: { allowJs: true } }],
  },
  transformIgnorePatterns: ["node_modules/(?!jose/)"],
  testPathIgnorePatterns: ["pact\\.(test|spec)"],
};

export default config;

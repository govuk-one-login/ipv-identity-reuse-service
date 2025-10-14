import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  reporters: ["default"],
  setupFiles: ["./setup-jest.ts"],
  testPathIgnorePatterns: ["pact\\.(test|spec)"],
};

export default config;

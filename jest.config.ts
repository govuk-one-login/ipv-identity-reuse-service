import type { Config } from "jest";

const config: Config = {
  transform: {
    "^.+\\.ts?$": "ts-jest",
  },
  testMatch: ["**/jest-cucumber/**/*.steps.ts"],
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  reporters: ["default"],
};

export default config;

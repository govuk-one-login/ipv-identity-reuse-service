import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  clearMocks: true,
  collectCoverage: false,
  reporters: ["default"],
  setupFiles: ["../../../setup-jest.ts"],
  projects: ["<rootDir>/consumer", "<rootDir>/provider"],
};

export default config;

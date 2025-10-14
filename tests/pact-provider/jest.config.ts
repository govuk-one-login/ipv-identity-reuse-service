import type { Config } from "jest";

const config: Config = {
  clearMocks: true,
  coverageProvider: "v8",
  preset: "ts-jest",
  setupFiles: ["./setup-jest.ts"],
};

export default config;

import type { Config } from "jest";

const config: Config = {
  displayName: "consumer",
  preset: "ts-jest",
  transform: {
    "^.+\\.[jt]sx?$": ["ts-jest", { tsconfig: { allowJs: true } }],
  },
  transformIgnorePatterns: ["/node_modules/(?!jose)"],
};

export default config;

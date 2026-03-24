const { defineConfig } = require("eslint/config");

const globals = require("globals");
const tsParser = require("@typescript-eslint/parser");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const vitest = require("@vitest/eslint-plugin");
const js = require("@eslint/js");

const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = defineConfig([
  {
    ignores: [".aws-sam/**", "eslint.config.cjs"],

    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tsParser,
    },

    plugins: {
      "@typescript-eslint": typescriptEslint,
    },

    extends: compat.extends(
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:prettier/recommended"
    ),

    rules: {
      "@typescript-eslint/no-var-requires": 0,
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": 2,

      "@typescript-eslint/explicit-module-boundary-types": [
        "warn",
        {
          allowArgumentsExplicitlyTypedAsAny: true,
        },
      ],

      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          caughtErrorsIgnorePattern: "^ignore",
        },
      ],

      "padding-line-between-statements": [
        "error",
        {
          blankLine: "any",
          prev: "*",
          next: "*",
        },
      ],
    },
  },
  {
    files: ["tests/**/*.test.ts"],

    plugins: ["@vitest"],

    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
]);

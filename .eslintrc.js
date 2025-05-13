module.exports = {
  env: {
    node: true,
  },
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"],
  rules: {
    "@typescript-eslint/no-var-requires": 0,
    "@typescript-eslint/no-explicit-any": "off",
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
    "padding-line-between-statements": ["error", { blankLine: "any", prev: "*", next: "*" }],
  },
  overrides: [
    {
      files: ["tests/**/*.test.ts"],
      plugins: ["jest"],
      extends: ["plugin:jest/recommended", "plugin:jest/style"],
      rules: {
        "jest/consistent-test-it": ["error", { fn: "it" }],
        "jest/prefer-hooks-in-order": ["error"],
        "jest/prefer-hooks-on-top": ["error"],
        "jest/prefer-lowercase-title": ["error", { ignore: ["describe"] }],
        "jest/prefer-strict-equal": ["error"],
      },
    },
  ],
};

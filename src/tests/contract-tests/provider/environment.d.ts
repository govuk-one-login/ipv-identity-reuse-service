declare namespace NodeJS {
  // eslint-disable-next-line unicorn/prevent-abbreviations -- This is an extension to the NodeJS definition
  interface ProcessEnv {
    PACT_URL?: string;
    PACT_USER?: string;
    PACT_PASSWORD?: string;
    PACT_BROKER_SOURCE_SECRET?: string;
  }
}

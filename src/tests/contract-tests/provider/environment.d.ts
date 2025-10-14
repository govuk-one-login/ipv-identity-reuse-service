declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PACT_URL?: string;
      PACT_USER?: string;
      PACT_PASSWORD?: string;
      PACT_BROKER_SOURCE_SECRET?: string;
    }
  }
}

export {};

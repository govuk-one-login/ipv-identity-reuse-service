declare global {
  namespace NodeJS {
    interface ProcessEnv {
      APP_CONFIG_APPLICATION: string;
      APP_CONFIG_NAME: string;
      ENVIRONMENT: string;
      EVCS_API_KEY_SECRET_ARN: string;
      POWERTOOLS_METRICS_NAMESPACE: string;
      POWERTOOLS_SERVICE_NAME: string;
      SQS_AUDIT_EVENT_QUEUE_URL: string;
      DID_SIGNING_KEY_ARN: string;
      DID_CONTROLLER: string;
      COMPONENT_ID: string;
    }
  }
}

export {};

import expect from "expect";

const DEFAULT_NAMESPACE = "DefaultNamespace";
const DEFAULT_SERVICE_NAME = "DefaultService";

process.env.POWERTOOLS_METRICS_NAMESPACE = DEFAULT_NAMESPACE;
process.env.POWERTOOLS_SERVICE_NAME = DEFAULT_SERVICE_NAME;
process.env.APP_CONFIG_APPLICATION = "id-reuse-service";
process.env.APP_CONFIG_NAME = "id-reuse-config";
process.env.ENVIRONMENT = "dev";
process.env.EVCS_API_KEY_SECRET_ARN = "arn:aws:secretsmanager:eu-west-2:000000000000:secret:SecretName-g58d2h"; //#pragma: allowlist secret
process.env.POWERTOOLS_DEV = "true";
process.env.POWERTOOLS_METRICS_DISABLED = "false";
process.env.SQS_AUDIT_EVENT_QUEUE_URL = "https://api.example.com";
process.env.DID_CONTROLLER = "did:web:identity.dev.account.gov.uk";

// Setup up spys on console
jest.spyOn(console, "log");
jest.spyOn(console, "error");
jest.spyOn(console, "warn");
jest.spyOn(console, "info");

expect.extend({
  /* toHaveEmittedEMFWith and toHaveEmittedMetricWith from http://github.com/aws-powertools/powertools-lambda-typescript */
  toHaveEmittedEMFWith(received, expected) {
    const calls = received.mock.calls;
    const messages = new Array(calls.length);
    if (calls.length === 0) {
      return {
        message: () => "Expected function to have emitted EMF with provided object",
        pass: false,
        actual: "No EMF emitted",
        expected,
      };
    }
    for (const [idx, call] of calls.entries()) {
      const [rawMessage] = call;
      try {
        messages[idx] = JSON.parse(rawMessage);
      } catch {
        messages[idx] = rawMessage;
      }
      if (this.equals(messages[idx], expected)) {
        return {
          message: () => "",
          pass: true,
        };
      }
    }

    return {
      message: () => "Expected function to have emitted EMF with provided object",
      pass: false,
      actual: messages,
      expected,
    };
  },
  toHaveEmittedMetricWith(received, expected) {
    const calls = received.mock.calls;
    const emfs = [];
    if (calls.length === 0) {
      return {
        message: () => "Expected function to have emitted metric with provided object",
        pass: false,
        actual: "No metric emitted",
        expected,
      };
    }
    for (const [idx, call] of calls.entries()) {
      const [rawMessage] = call;
      try {
        emfs[idx] = JSON.parse(rawMessage);
      } catch {
        emfs[idx] = rawMessage;
      }
      const metrics = emfs[idx]._aws.CloudWatchMetrics;
      if (metrics) {
        for (const metric of metrics) {
          if (this.equals(metric, expected)) {
            return {
              message: () => "",
              pass: true,
            };
          }
        }
      }
    }

    return {
      message: () => "Expected function to have emitted metric with provided object",
      pass: false,
      actual: emfs,
      expected,
    };
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
    interface Matchers<R, T = {}> {
      toHaveEmittedMetricWith(expected: Record<string, unknown>): void;
      toHaveEmittedEMFWith(expected: Record<string, unknown>): void;
    }
  }
}

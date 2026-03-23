import type { MatcherResult, MatcherState, MockInstance } from "vitest";
import { expect, vi } from "vitest";

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
process.env.COMPONENT_ID = "https://identity.local.account.gov.uk/sis";
process.env.AWS_REGION = "eu-west-2";
process.env.AWS_EC2_METADATA_DISABLED = "true";

function toHaveEmittedEMFWith(this: MatcherState, received: MockInstance, expected: unknown): MatcherResult {
  if (!vi.isMockFunction(received)) {
    throw new Error("Expected a mock function");
  }

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
}

function toHaveEmittedMetricWith(this: MatcherState, received: MockInstance, expected: unknown): MatcherResult {
  if (!vi.isMockFunction(received)) {
    throw new Error("Expected a mock function");
  }

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
    actual: "Metric not found",
    expected,
  };
}

expect.extend({ toHaveEmittedEMFWith, toHaveEmittedMetricWith });

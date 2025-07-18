import { SQSEvent, SQSRecord } from "aws-lambda";
import { handler } from "./message-processor";
import { mockClient } from "aws-sdk-client-mock";
import { SecretsManagerClient, GetSecretValueCommand, GetSecretValueResponse } from "@aws-sdk/client-secrets-manager";
import {
  AppConfigDataClient,
  StartConfigurationSessionCommand,
  StartConfigurationSessionCommandOutput,
  GetLatestConfigurationCommand,
  GetLatestConfigurationCommandOutput,
} from "@aws-sdk/client-appconfigdata";
import { Uint8ArrayBlobAdapter } from "@smithy/util-stream";
import { Configuration } from "../types/configuration";
import { MetricDimension, MetricName } from "../types/metricEnum";
import { TxmaMessage } from "../types/txmaMessage";
import { MetricUnit } from "@aws-lambda-powertools/metrics";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const createTestSQSEvent = <T extends object>(...events: T[]): SQSEvent => ({
  Records: events.map((event) => ({ body: JSON.stringify(event) }) as never as SQSRecord),
});

const DEFAULT_CONFIGURATION: Configuration = Object.freeze({
  evcsApiUrl: "http://api.example.com",
  interventionCodesToInvalidate: ["12", "34"],
});

const VALID_TXMA_MESSAGE: TxmaMessage = Object.freeze({
  user_id: "test-user-id",
  timestamp: Math.floor(Date.now() / 1000),
  intervention_code: "12",
});

describe("message-processor", () => {
  beforeAll(() => {
    const secretsManagerMock = mockClient(SecretsManagerClient);
    secretsManagerMock.on(GetSecretValueCommand).resolves({
      SecretString: "retrieved string",
    } satisfies GetSecretValueResponse);

    const appConfigMock = mockClient(AppConfigDataClient);
    appConfigMock
      .on(StartConfigurationSessionCommand)
      .resolves({
        $metadata: {},
        InitialConfigurationToken: "token",
      } satisfies StartConfigurationSessionCommandOutput)
      .on(GetLatestConfigurationCommand)
      .resolves({
        $metadata: {},
        Configuration: Uint8ArrayBlobAdapter.fromString(JSON.stringify(DEFAULT_CONFIGURATION)),
      } satisfies GetLatestConfigurationCommandOutput);

    const sqsClientMock = mockClient(SQSClient);
    sqsClientMock.on(SendMessageCommand).resolves({});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should accept an array of empty records", async () => {
    const sqsEvent = createTestSQSEvent();
    await expect(handler(sqsEvent)).resolves.toBeUndefined();

    // eslint-disable-next-line no-console
    expect(console.log).toHaveEmittedMetricWith(
      expect.objectContaining({
        Metrics: [{ Name: MetricName.MessagesReceived, Unit: MetricUnit.Count }],
        Namespace: process.env.POWERTOOLS_METRICS_NAMESPACE,
      })
    );
  });

  it("should reject records without a body", async () => {
    const sqsEvent = createTestSQSEvent(undefined as never as object);

    await expect(handler(sqsEvent)).rejects.toThrow("SQS record 0 does not have a body");

    // eslint-disable-next-line no-console
    expect(console.log).not.toHaveEmittedMetricWith(
      expect.objectContaining({
        Metrics: [{ Name: MetricName.MessagesReceived, Unit: MetricUnit.Count }],
        Namespace: process.env.POWERTOOLS_METRICS_NAMESPACE,
      })
    );
  });

  it.each(["user_id", "timestamp", "intervention_code"] as Array<keyof TxmaMessage>)(
    "should reject records which does not have the %s field",
    async (field) => {
      const testMessage: Partial<TxmaMessage> = { ...VALID_TXMA_MESSAGE };
      delete testMessage[field];

      const sqsEvent = createTestSQSEvent(testMessage);

      await expect(handler(sqsEvent)).rejects.toThrow("SQS record 0 does not have required fields");

      // eslint-disable-next-line no-console
      expect(console.log).not.toHaveEmittedMetricWith(
        expect.objectContaining({
          Metrics: [{ Name: MetricName.MessagesReceived, Unit: MetricUnit.Count }],
          Namespace: process.env.POWERTOOLS_METRICS_NAMESPACE,
        })
      );
    }
  );

  it("should only invalidate records which have the intervention code", async () => {
    const mockFetch = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(""),
    } as Response);

    const sqsEvent = createTestSQSEvent<TxmaMessage>(
      {
        user_id: "bob.smith-12345",
        timestamp: 1752755394,
        intervention_code: "01",
      },
      {
        user_id: "jane.smith-12345",
        timestamp: 1752755454,
        intervention_code: "12",
      },
      {
        user_id: "cyril.jones-12345",
        timestamp: 1752755496,
        intervention_code: "23",
      },
      {
        user_id: "helen.jones-12345",
        timestamp: 1752755496,
        intervention_code: "34",
      }
    );

    await expect(handler(sqsEvent)).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledTimes(2);

    // eslint-disable-next-line no-console
    expect(console.log).not.toHaveEmittedEMFWith(
      expect.objectContaining({
        service: process.env.POWERTOOLS_SERVICE_NAME,
        [MetricDimension.InterventionCode]: "01",
        [MetricName.IdentityInvalidatedOnIntervention]: 1,
      })
    );
    // eslint-disable-next-line no-console
    expect(console.log).toHaveEmittedEMFWith(
      expect.objectContaining({
        service: process.env.POWERTOOLS_SERVICE_NAME,
        [MetricDimension.InterventionCode]: "12",
        [MetricName.IdentityInvalidatedOnIntervention]: 1,
      })
    );
    // eslint-disable-next-line no-console
    expect(console.log).not.toHaveEmittedEMFWith(
      expect.objectContaining({
        service: process.env.POWERTOOLS_SERVICE_NAME,
        [MetricDimension.InterventionCode]: "23",
        [MetricName.IdentityInvalidatedOnIntervention]: 1,
      })
    );
    // eslint-disable-next-line no-console
    expect(console.log).toHaveEmittedEMFWith(
      expect.objectContaining({
        service: process.env.POWERTOOLS_SERVICE_NAME,
        [MetricDimension.InterventionCode]: "34",
        [MetricName.IdentityInvalidatedOnIntervention]: 1,
      })
    );
    // eslint-disable-next-line no-console
    expect(console.log).toHaveEmittedEMFWith(
      expect.objectContaining({
        service: process.env.POWERTOOLS_SERVICE_NAME,
        [MetricName.MessagesReceived]: 4,
      })
    );
    // eslint-disable-next-line no-console
    expect(console.log).toHaveEmittedMetricWith(
      expect.objectContaining({
        Metrics: [{ Name: MetricName.MessagesReceived, Unit: MetricUnit.Count }],
        Namespace: process.env.POWERTOOLS_METRICS_NAMESPACE,
      })
    );
  });

  it("should record if the identity does not exist", async () => {
    const mockFetch = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: () => ({ message: "Identity does not exist" }),
    } as never as Response);

    const sqsEvent = createTestSQSEvent<TxmaMessage>({
      user_id: "jane.smith-12345",
      timestamp: 1752755454,
      intervention_code: "12",
    });

    await expect(handler(sqsEvent)).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // eslint-disable-next-line no-console
    expect(console.log).not.toHaveEmittedEMFWith(
      expect.objectContaining({
        service: process.env.POWERTOOLS_SERVICE_NAME,
        [MetricDimension.InterventionCode]: "12",
        [MetricName.IdentityInvalidatedOnIntervention]: 1,
      })
    );
    // eslint-disable-next-line no-console
    expect(console.log).toHaveEmittedEMFWith(
      expect.objectContaining({
        service: process.env.POWERTOOLS_SERVICE_NAME,
        [MetricName.IdentityDoesNotExist]: 1,
      })
    );
    // eslint-disable-next-line no-console
    expect(console.log).toHaveEmittedEMFWith(
      expect.objectContaining({
        service: process.env.POWERTOOLS_SERVICE_NAME,
        [MetricName.MessagesReceived]: 1,
      })
    );
    // eslint-disable-next-line no-console
    expect(console.log).toHaveEmittedMetricWith(
      expect.objectContaining({
        Metrics: [
          { Name: MetricName.MessagesReceived, Unit: MetricUnit.Count },
          { Name: MetricName.IdentityDoesNotExist, Unit: "Count" },
        ],
        Namespace: process.env.POWERTOOLS_METRICS_NAMESPACE,
      })
    );
  });

  it("should throw an error on identity service error", async () => {
    const mockFetch = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: () => ({ message: "Internal server error" }),
    } as never as Response);

    const sqsEvent = createTestSQSEvent<TxmaMessage>({
      user_id: "jane.smith-12345",
      timestamp: 1752755454,
      intervention_code: "12",
    });

    await expect(handler(sqsEvent)).rejects.toThrow("Call to invalidation endpoint failed");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

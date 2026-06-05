import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { mockClient } from "aws-sdk-client-mock";
import { auditIdentityRecordInvalidated } from "../audit";
import { TxmaSisIdentityRecordInvalidated } from "../audit-events";
import { vi, beforeAll, afterAll, it, expect } from "vitest";
import "aws-sdk-client-mock-vitest/extend";

const sqsClientMock = mockClient(SQSClient);
sqsClientMock.on(SendMessageCommand).resolves({});

beforeAll(() => {
  vi.useFakeTimers({
    now: 1_753_094_598_807,
  });
});

afterAll(() => {
  vi.useRealTimers();
});

it("should send the message using the defined specification", async () => {
  await auditIdentityRecordInvalidated("bob.smith", "12");

  const identityRecordInvalidatedEvent: TxmaSisIdentityRecordInvalidated = {
    component_id: "https://identity.local.account.gov.uk/sis",
    event_name: "SIS_IDENTITY_RECORD_INVALIDATED",
    event_timestamp_ms: 1_753_094_598_807,
    timestamp: 1_753_094_598,
    user: { user_id: "bob.smith" },
    extensions: { intervention_code: "12" },
    restricted: undefined,
  };

  expect(sqsClientMock).toHaveReceivedCommandWith(SendMessageCommand, {
    QueueUrl: process.env.SQS_AUDIT_EVENT_QUEUE_URL,
    MessageBody: JSON.stringify(identityRecordInvalidatedEvent),
  });
});

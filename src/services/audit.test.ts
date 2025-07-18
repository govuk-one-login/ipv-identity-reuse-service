import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { auditIdentityRecordInvalidated } from "./audit";
import { IdentityRecordInvalidatedEvent } from "../types/auditEvents";

const sqsClientMock = mockClient(SQSClient);
sqsClientMock.on(SendMessageCommand).resolves({});

beforeAll(() => {
  jest.useFakeTimers({
    now: 1753094598807,
  });
});

afterAll(() => {
  jest.useRealTimers();
});

it("should send the message using the defined specification", async () => {
  await auditIdentityRecordInvalidated("bob.smith", "12");

  const identityRecordInvalidatedEvent: IdentityRecordInvalidatedEvent = {
    component_id: "SIS",
    event_timestamp_ms: Date.now(),
    timestamp: Math.floor(Date.now() / 1000),
    user: { user_id: "bob.smith" },
    event_name: "SIS_IDENTITY_RECORD_INVALIDATED",
    extensions: { intervention_code: "12" },
  };

  expect(sqsClientMock).toHaveReceivedCommandWith(SendMessageCommand, {
    QueueUrl: process.env.SQS_AUDIT_EVENT_QUEUE_URL,
    MessageBody: JSON.stringify(identityRecordInvalidatedEvent),
  });
});

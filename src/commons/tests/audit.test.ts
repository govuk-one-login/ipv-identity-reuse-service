import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { auditIdentityRecordInvalidated } from "../audit";
import { TxmaSisIdentityRecordInvalidated } from "../audit-events";

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

  const identityRecordInvalidatedEvent: TxmaSisIdentityRecordInvalidated = {
    component_id: "https://identity.local.account.gov.uk/sis",
    event_name: "SIS_IDENTITY_RECORD_INVALIDATED",
    event_timestamp_ms: 1753094598807,
    timestamp: 1753094598,
    user: { user_id: "bob.smith" },
    extensions: { intervention_code: "12" },
    restricted: undefined,
  };

  expect(sqsClientMock).toHaveReceivedCommandWith(SendMessageCommand, {
    QueueUrl: process.env.SQS_AUDIT_EVENT_QUEUE_URL,
    MessageBody: JSON.stringify(identityRecordInvalidatedEvent),
  });
});

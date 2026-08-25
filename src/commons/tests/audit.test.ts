import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { mockClient } from "aws-sdk-client-mock";
import { auditIdentityRecordInvalidated, auditIdentityRecordRead, auditIdentityRecordReturned } from "../audit";
import { vi, beforeAll, afterAll, it, expect } from "vitest";
import "aws-sdk-client-mock-vitest/extend";
import { SIS_IDENTITY_RECORD_INVALIDATED } from "@govuk-one-login/event-catalogue/SIS_IDENTITY_RECORD_INVALIDATED";
import {
  SIS_STORED_IDENTITY_READ,
  SisStoredIdentityReadExtensions,
  SisStoredIdentityReadRestricted,
} from "@govuk-one-login/event-catalogue/SIS_STORED_IDENTITY_READ";
import {
  SIS_STORED_IDENTITY_RETURNED,
  SisStoredIdentityReturnedExtensions,
  SisStoredIdentityReturnedRestricted,
} from "@govuk-one-login/event-catalogue/SIS_STORED_IDENTITY_RETURNED";

const EXAMPLE_USER_ID = "bob.smith";

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

it("should send SIS_STORED_IDENTITY_RETURNED in correct format", async () => {
  const extensions: SisStoredIdentityReturnedExtensions = Object.freeze({
    response_outcome: "returned",
  });

  const restricted: SisStoredIdentityReturnedRestricted = Object.freeze({
    response_body: {
      content: undefined,
    },
  });

  await auditIdentityRecordReturned(extensions, restricted, EXAMPLE_USER_ID);

  const event: SIS_STORED_IDENTITY_RETURNED = {
    component_id: "https://identity.local.account.gov.uk/sis",
    event_name: "SIS_STORED_IDENTITY_RETURNED",
    event_timestamp_ms: 1_753_094_598_807,
    timestamp: 1_753_094_598,
    user: { user_id: EXAMPLE_USER_ID },
    extensions,
    restricted,
  };

  expect(sqsClientMock).toHaveReceivedCommandWith(SendMessageCommand, {
    QueueUrl: process.env.SQS_AUDIT_EVENT_QUEUE_URL,
    MessageBody: JSON.stringify(event),
  });
});

it("should send SIS_STORED_IDENTITY_READ in correct format", async () => {
  const extensions: SisStoredIdentityReadExtensions = Object.freeze({
    retrieval_outcome: "success",
  });

  const restricted: SisStoredIdentityReadRestricted = Object.freeze({
    stored_identity_jwt: "header.body.part",
  });

  await auditIdentityRecordRead(extensions, restricted, EXAMPLE_USER_ID);

  const identityRecordInvalidatedEvent: SIS_STORED_IDENTITY_READ = {
    component_id: "https://identity.local.account.gov.uk/sis",
    event_name: "SIS_STORED_IDENTITY_READ",
    event_timestamp_ms: 1_753_094_598_807,
    timestamp: 1_753_094_598,
    user: { user_id: EXAMPLE_USER_ID },
    extensions,
    restricted,
  };

  expect(sqsClientMock).toHaveReceivedCommandWith(SendMessageCommand, {
    QueueUrl: process.env.SQS_AUDIT_EVENT_QUEUE_URL,
    MessageBody: JSON.stringify(identityRecordInvalidatedEvent),
  });
});

it("should send SIS_IDENTITY_RECORD_INVALIDATED in correct format", async () => {
  await auditIdentityRecordInvalidated("bob.smith", "07");

  const identityRecordInvalidatedEvent: SIS_IDENTITY_RECORD_INVALIDATED = {
    component_id: "https://identity.local.account.gov.uk/sis",
    event_name: "SIS_IDENTITY_RECORD_INVALIDATED",
    event_timestamp_ms: 1_753_094_598_807,
    timestamp: 1_753_094_598,
    user: { user_id: "bob.smith" },
    extensions: { intervention_code: "07" },
  };

  expect(sqsClientMock).toHaveReceivedCommandWith(SendMessageCommand, {
    QueueUrl: process.env.SQS_AUDIT_EVENT_QUEUE_URL,
    MessageBody: JSON.stringify(identityRecordInvalidatedEvent),
  });
});

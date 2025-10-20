import { SQSClient, SendMessageCommand, SendMessageCommandOutput } from "@aws-sdk/client-sqs";
import {
  TxmaEvent,
  TxmaSisIdentityRecordInvalidated,
  TxmaSisStoredIdentityReadEvent,
  TxmaSisStoredIdentityReturnedEvent,
} from "./audit-events";

const sqsClient = new SQSClient({});

export const sendAuditMessage = async <
  EventName extends string,
  ExtensionsT extends object | undefined = undefined,
  RestrictedT extends object | undefined = undefined,
>(
  message: TxmaEvent<EventName, ExtensionsT, RestrictedT>
): Promise<SendMessageCommandOutput> =>
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: process.env.SQS_AUDIT_EVENT_QUEUE_URL,
      MessageBody: JSON.stringify(message),
    })
  );

const createDefaultEventFields = <EventName extends string>(
  eventName: EventName,
  userId: string,
  govukSigninJourneyId?: string
): TxmaEvent<EventName, never, never> => {
  return {
    component_id: process.env.COMPONENT_ID || "Unknown",
    event_name: eventName,
    event_timestamp_ms: Date.now(),
    timestamp: Math.floor(Date.now() / 1000),
    user: {
      user_id: userId,
      ...(govukSigninJourneyId ? { govuk_signin_journey_id: govukSigninJourneyId } : {}),
    },
  };
};

export const auditIdentityRecordRead = async (
  extensions: TxmaSisStoredIdentityReadEvent["extensions"],
  restricted: TxmaSisStoredIdentityReadEvent["restricted"],
  userId: string,
  govukSigninJourneyId?: string
): Promise<SendMessageCommandOutput> => {
  const identityReadEvent: TxmaSisStoredIdentityReadEvent = {
    ...createDefaultEventFields("SIS_STORED_IDENTITY_READ", userId, govukSigninJourneyId),
    extensions,
    restricted,
  };

  return await sendAuditMessage(identityReadEvent);
};

export const auditIdentityRecordReturned = async (
  extensions: TxmaSisStoredIdentityReturnedEvent["extensions"],
  restricted: TxmaSisStoredIdentityReturnedEvent["restricted"],
  userId: string,
  govukSigninJourneyId?: string
): Promise<SendMessageCommandOutput> => {
  const identityReturnedEvent: TxmaSisStoredIdentityReturnedEvent = {
    ...createDefaultEventFields("SIS_STORED_IDENTITY_RETURNED", userId, govukSigninJourneyId),
    extensions,
    restricted,
  };

  return await sendAuditMessage(identityReturnedEvent);
};

export const auditIdentityRecordInvalidated = async (
  userId: string,
  interventionCode: string
): Promise<SendMessageCommandOutput> => {
  const identityRecordInvalidatedEvent: TxmaSisIdentityRecordInvalidated = {
    ...createDefaultEventFields("SIS_IDENTITY_RECORD_INVALIDATED", userId),
    extensions: { intervention_code: interventionCode },
    restricted: undefined as never,
  };

  return await sendAuditMessage(identityRecordInvalidatedEvent);
};

import { SQSClient, SendMessageCommand, SendMessageCommandOutput } from "@aws-sdk/client-sqs";
import {
  SIS_STORED_IDENTITY_READ,
  SisStoredIdentityReadRestricted,
  SisStoredIdentityReadExtensions,
} from "@govuk-one-login/event-catalogue/SIS_STORED_IDENTITY_READ";
import {
  SIS_IDENTITY_RECORD_INVALIDATED,
  InterventionCodeEnum,
} from "@govuk-one-login/event-catalogue/SIS_IDENTITY_RECORD_INVALIDATED";
import {
  SIS_STORED_IDENTITY_RETURNED,
  SisStoredIdentityReturnedExtensions,
  SisStoredIdentityReturnedRestricted,
} from "@govuk-one-login/event-catalogue/SIS_STORED_IDENTITY_RETURNED";

const sqsClient = new SQSClient({});

type MessageType = SIS_STORED_IDENTITY_READ | SIS_IDENTITY_RECORD_INVALIDATED | SIS_STORED_IDENTITY_RETURNED;

export const sendAuditMessage = async (message: MessageType): Promise<SendMessageCommandOutput> =>
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
) => {
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
  extensions: SisStoredIdentityReadExtensions,
  restricted: SisStoredIdentityReadRestricted,
  userId: string,
  govukSigninJourneyId?: string
): Promise<SendMessageCommandOutput> => {
  const identityReadEvent: SIS_STORED_IDENTITY_READ = {
    ...createDefaultEventFields("SIS_STORED_IDENTITY_READ", userId, govukSigninJourneyId),
    extensions,
    restricted,
  };

  return await sendAuditMessage(identityReadEvent);
};

export const auditIdentityRecordReturned = async (
  extensions: SisStoredIdentityReturnedExtensions,
  restricted: SisStoredIdentityReturnedRestricted,
  userId: string,
  govukSigninJourneyId?: string
): Promise<SendMessageCommandOutput> => {
  const identityReturnedEvent: SIS_STORED_IDENTITY_RETURNED = {
    ...createDefaultEventFields("SIS_STORED_IDENTITY_RETURNED", userId, govukSigninJourneyId),
    extensions,
    restricted,
  };

  return await sendAuditMessage(identityReturnedEvent);
};

export const auditIdentityRecordInvalidated = async (
  userId: string,
  interventionCode: InterventionCodeEnum
): Promise<SendMessageCommandOutput> => {
  const identityRecordInvalidatedEvent: SIS_IDENTITY_RECORD_INVALIDATED = {
    ...createDefaultEventFields("SIS_IDENTITY_RECORD_INVALIDATED", userId),
    extensions: { intervention_code: interventionCode },
  };

  return await sendAuditMessage(identityRecordInvalidatedEvent);
};

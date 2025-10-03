import { SQSClient, SendMessageCommand, SendMessageCommandOutput } from "@aws-sdk/client-sqs";
import { TxmaEvent, TxmaSisIdentityRecordInvalidated } from "./audit-events";

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

export const auditIdentityRecordInvalidated = async (
  userId: string,
  interventionCode: string
): Promise<SendMessageCommandOutput> => {
  const identityRecordInvalidatedEvent: TxmaSisIdentityRecordInvalidated = {
    component_id: "SIS",
    event_timestamp_ms: Date.now(),
    timestamp: Math.floor(Date.now() / 1000),
    user: { user_id: userId },
    event_name: "SIS_IDENTITY_RECORD_INVALIDATED",
    extensions: { intervention_code: interventionCode },
    restricted: undefined as never,
  };

  return await sendAuditMessage(identityRecordInvalidatedEvent);
};

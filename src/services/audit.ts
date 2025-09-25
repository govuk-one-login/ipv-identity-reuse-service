import { SQSClient, SendMessageCommand, SendMessageCommandOutput } from "@aws-sdk/client-sqs";
import { AuditEvent } from "../types/audit-events";

const sqsClient = new SQSClient({});

const sendAuditMessage = async <T extends object>(message: T) =>
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
  const identityRecordInvalidatedEvent: AuditEvent = {
    component_id: "SIS",
    event_timestamp_ms: Date.now(),
    timestamp: Math.floor(Date.now() / 1000),
    user: { user_id: userId },
    event_name: "SIS_IDENTITY_RECORD_INVALIDATED",
    extensions: { intervention_code: interventionCode },
  };

  return await sendAuditMessage(identityRecordInvalidatedEvent);
};

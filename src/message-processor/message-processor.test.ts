import { handler } from "./message-processor";
import { SQSEvent } from "aws-lambda";
import { LogIds } from "../types/logIds";

describe("message-processor", () => {
  it("should just work", async () => {
    const body = { logIds: {} as LogIds };
    const event: SQSEvent = {
      Records: [
        {
          messageId: "messageId",
          receiptHandle: "receiptHandle",
          body: JSON.stringify(body),
          attributes: {
            ApproximateReceiveCount: "1",
            SentTimestamp: "1672531200000",
            SenderId: "AROAEXAMPLEID",
            ApproximateFirstReceiveTimestamp: "1672531201000",
          },
          messageAttributes: {},
          md5OfBody: "098f6bcd4621d373cade4e832627b4f6",
          eventSource: "aws:sqs",
          eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:my-queue",
          awsRegion: "us-east-1",
        },
      ],
    };

    const result: string = await handler(event);

    expect(result).toBe("execution succeeded");
  });
});

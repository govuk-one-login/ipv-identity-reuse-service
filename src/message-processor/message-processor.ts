import { LogIds } from "../types/logIds";
import logger from "../utils/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { SQSEvent } from "aws-lambda";

const messageProcessorMetrics = new Metrics();
const MESSAGES_RECEIVED = "MessagesRecieved";

export interface Request {
  logIds: LogIds;
}

export const handler = async (event: SQSEvent): Promise<string> => {
  for (const record of event.Records) {
    try {
      const request = JSON.parse(record.body) as Request;
      logger.info("Message body", { logIds: request.logIds });
      messageProcessorMetrics.addMetric(MESSAGES_RECEIVED, MetricUnit.Count, 1);
    } catch (e) {
      logger.error("Failed to process record", {
        error: e instanceof Error ? e : { message: String(e) },
        rawBody: record.body,
      });
    }
  }

  messageProcessorMetrics.publishStoredMetrics();
  return "execution succeeded";
};

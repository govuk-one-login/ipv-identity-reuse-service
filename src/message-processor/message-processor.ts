import logger from "../utils/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { SQSEvent } from "aws-lambda";

import { MetricEnum } from "../types/metricEnum";
import { MessageProcessorRequest } from "../types/messageProcessorRequest";

const messageProcessorMetrics = new Metrics();

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    try {
      const request = JSON.parse(record.body) as MessageProcessorRequest;
      logger.info("Message body", { logIds: request.logIds });
      messageProcessorMetrics.addMetric(MetricEnum.MessagesReceived, MetricUnit.Count, 1);
    } catch (e) {
      logger.error("Failed to process record", {
        error: e instanceof Error ? e : { message: String(e) },
        rawBody: record.body,
      });
    }
  }

  messageProcessorMetrics.publishStoredMetrics();
};

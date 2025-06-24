import { logIds } from "../types/logIds";
import logger from "../utils/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";

const messageProcessorMetrics = new Metrics();
const MESSAGES_RECEIVED = "MessagesRecieved";

export interface Request {
  logIds: logIds;
}

export const handler = async <T extends Request>(request: T): Promise<string> => {
  logger.info(JSON.stringify(request.logIds));
  messageProcessorMetrics.addMetric(MESSAGES_RECEIVED, MetricUnit.Count, 1);
  messageProcessorMetrics.publishStoredMetrics();
  return "execution succeeded";
};

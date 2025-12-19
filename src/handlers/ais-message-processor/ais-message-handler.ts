import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { SQSEvent, SQSRecord } from "aws-lambda";

import { MetricDimension, MetricName } from "../../commons/metric-enum";
import { isAisMessage, AisMessage } from "./ais-message";

import { getConfiguration, type Configuration } from "../../services/configuration";
import { isStringWithLength } from "../../commons/string-utils";
import logger from "../../commons/logger";
import { auditIdentityRecordInvalidated } from "../../services/audit";
import {
  invalidateIdentityInCredentialStore,
  isCredentialStoreErrorResponse,
} from "../../services/encrypted-credential-store";

const metrics = new Metrics();

export const handler = async (event: SQSEvent): Promise<void> => {
  const records = parseSQSRecords(event.Records);

  logger.info(`Event received containing ${records.length} messages`);
  metrics.addMetric(MetricName.MessagesReceived, MetricUnit.Count, records.length);

  const config = await getConfiguration();

  try {
    for (const record of records) {
      if (!isInterventionRecord(record, config)) {
        logger.info(`Message does not contain relevant intervention code`);
        continue;
      }

      await invalidateUser(record.user_id, record.intervention_code!);
    }
  } finally {
    metrics.publishStoredMetrics();
  }
};

const invalidateUser = async (userId: string, interventionCode: string) => {
  try {
    const response = await invalidateIdentityInCredentialStore(userId);

    if (response.ok) {
      logger.info(`Successfully invalidated user identity`);
      const invalidateMetric = metrics.singleMetric();
      invalidateMetric.addDimension(MetricDimension.InterventionCode, interventionCode);
      invalidateMetric.addMetric(MetricName.IdentityInvalidatedOnIntervention, MetricUnit.Count, 1);

      await auditIdentityRecordInvalidated(userId, interventionCode);
    } else {
      const responseBody = await response.json();
      if (isCredentialStoreErrorResponse(responseBody) && response.status === 404) {
        metrics.addMetric(MetricName.IdentityDoesNotExist, MetricUnit.Count, 1);
      } else {
        logger.error("Error calling service to invalid user", {
          cause: response.statusText,
          status: response.status,
          body: responseBody,
        });
        throw new Error("Call to invalidation endpoint failed");
      }
    }
  } catch (e) {
    if (e instanceof TypeError) {
      logger.error("Error calling service to invalidate user", { cause: e.cause, message: e.message });
    }
    throw e;
  }
};

const parseSQSRecords = (records: SQSRecord[]): AisMessage[] =>
  records.map((record, index) => {
    if (!record?.body) {
      throw new Error(`SQS record ${index} does not have a body`);
    }

    const recordObj = JSON.parse(record.body);
    if (isAisMessage(recordObj)) {
      return recordObj;
    }

    throw new Error(`SQS record ${index} does not have required fields`);
  });

const isInterventionRecord = (message: AisMessage, configuration: Configuration) =>
  isStringWithLength(message.intervention_code) &&
  configuration.interventionCodesToInvalidate.includes(message.intervention_code);

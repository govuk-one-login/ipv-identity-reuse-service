import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { SQSEvent, SQSRecord } from "aws-lambda";

import { MetricDimension, MetricName } from "../types/metricEnum";
import { isTxmaMessage, TxmaMessage } from "../types/txmaMessage";

import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { getConfiguration, type Configuration } from "../types/configuration";
import { getString } from "../types/stringutils";
import logger from "../utils/logger";
import { isErrorResponse } from "../types/endpoint";

const metrics = new Metrics();

/**
 * AWS Lambda handler
 * @param event Simple Queue Service event
 */
export const handler = async (event: SQSEvent): Promise<void> => {
  const records = parseSQSRecords(event.Records);
  const apiKey: string | undefined = await getServiceApiKey();

  metrics.addMetric(MetricName.MessagesReceived, MetricUnit.Count, records.length);

  const config = await getConfiguration();

  try {
    for (const record of records) {
      if (!isInterventionRecord(record, config)) {
        continue;
      }

      await invalidateUser(record.user_id, record.intervention_code, config.evcsApiUrl, apiKey);
    }
  } finally {
    metrics.publishStoredMetrics();
  }
};

/**
 * Invalid the given user id
 * @param userId - The user id to invalidate
 * @param interventionCode - The intervention code which is invalidating the user
 * @param baseUrl - The base URL of the service to call
 * @param apiKey - The API Key of the service to call
 */
const invalidateUser = async (userId: string, interventionCode: string, baseUrl: string, apiKey?: string) => {
  try {
    const response = await fetch(`${baseUrl}/identity/invalidate`, {
      method: "POST",
      body: JSON.stringify({ userId: userId }),
      headers: {
        ...(apiKey && { "x-api-key": apiKey }),
      },
    });

    if (!response.ok) {
      const responseBody = await response.json();
      if (isErrorResponse(responseBody) && response.status === 404) {
        metrics.addMetric(MetricName.IdentityDoesNotExist, MetricUnit.Count, 1);
      } else {
        logger.error("Error calling service to invalid user", {
          cause: response.statusText,
          status: response.status,
          body: responseBody,
        });
        throw new Error("Call to invalidation endpoint failed");
      }
    } else {
      const invalidateMetric = metrics.singleMetric();
      invalidateMetric.addDimension(MetricDimension.InterventionCode, interventionCode);
      invalidateMetric.addMetric(MetricName.IdentityInvalidatedOnIntervention, MetricUnit.Count, 1);
    }
  } catch (e) {
    if (e instanceof TypeError) {
      logger.error("Error calling service to invalidate user", { cause: e.cause, message: e.message });
    }
    throw e;
  }
};

/**
 * Get the service API key from secrets manager. This will cache the result for
 * the default period. The secret is undefined an Error is thrown.
 * @returns The service API key or undefined if not present
 */
const getServiceApiKey = async (): Promise<string | undefined> =>
  getString(await getSecret(process.env.EVCS_API_KEY_SECRET_ARN));

/**
 * Parses each of the SQS Records and returns each of the TXMA messages. If any
 * of the messages is not a valid TXMA message an error is thrown.
 * @param records - SQS records to transform
 * @returns Array of TXMA messages
 */
const parseSQSRecords = (records: SQSRecord[]): TxmaMessage[] =>
  records.map((record, index) => {
    if (!record?.body) {
      throw new Error(`SQS record ${index} does not have a body`);
    }

    const recordObj = JSON.parse(record.body);
    if (isTxmaMessage(recordObj)) {
      return recordObj;
    }

    throw new Error(`SQS record ${index} does not have required fields`);
  });

/**
 * Test whether the given TXMA message contains an intervention code
 * @param message - The TXMA message to test
 * @param configuration - Application configuration
 * @returns true if the message contains an intervention code
 */
const isInterventionRecord = (message: TxmaMessage, configuration: Configuration) =>
  configuration.interventionCodesToInvalidate.some((code) => message.intervention_code === code);

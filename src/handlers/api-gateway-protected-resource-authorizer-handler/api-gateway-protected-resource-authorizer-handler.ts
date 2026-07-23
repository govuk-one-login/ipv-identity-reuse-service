import {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerEvent,
  APIGatewayRequestAuthorizerEventHeaders,
  Context,
  PolicyDocument,
  Statement,
  StatementEffect,
} from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import logger from "../../commons/logger";
import { Dimensions } from "@aws-lambda-powertools/metrics/types";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { PolicyGenerationError } from "../../commons/errors";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { sha256Hash } from "../../commons/hashing";
import { MetricDimension, MetricName } from "../../commons/metric-enum";
import { getProperty } from "../../commons/case-insensitive-header-utilities";

export const metric: Metrics = new Metrics();

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent,
  context: Context
): Promise<APIGatewayAuthorizerResult> => {
  logger.addContext(context);
  const authorizationHeader = getProperty(event.headers || {}, "authorization");

  if (!authorizationHeader) {
    logger.error("Authorization failed as no header present");
    addMetric(MetricName.AccessTokenValidationFailure, 1, {
      [MetricDimension.Reason]: "header-not-present",
    });
    throw new Error("Unauthorized");
  }

  if (!authorizationHeader?.startsWith("Bearer ")) {
    logger.error("Authorization header is not a bearer token");
    addMetric(MetricName.AccessTokenValidationFailure, 1, {
      [MetricDimension.Reason]: "not-a-bearer-token",
    });
    throw new Error("Unauthorized");
  }

  try {
    const command = new QueryCommand({
      TableName: process.env.SESSION_TABLE_NAME,
      IndexName: "access-token-index-with-event-data",
      KeyConditionExpression: "accessToken = :tokenValue",
      ExpressionAttributeValues: {
        ":tokenValue": {
          S: authorizationHeader?.slice(7),
        },
      },
    });
    const response = await documentClient.send(command);
    if (response.Items?.length == 1) {
      const retrievedRecord = unmarshall(response.Items[0]);
      const subjectId: string = retrievedRecord.subject;
      const storageToken: string = retrievedRecord.storageToken;
      // In the near future, we will also make it an error if storageToken
      // is not present in the session. For now, we'll treat it as optional.
      if (subjectId) {
        addMetric(MetricName.AccessTokenValidationSuccessful);
        return generatePolicy(sha256Hash(subjectId), "Allow", event.methodArn, subjectId, storageToken);
      }

      logger.error("Access token found, but no subject stored in session.");
      addMetric(MetricName.AccessTokenValidationFailure, 1, {
        [MetricDimension.Reason]: "missing-subject",
      });
    } else if (response.Items && response.Items.length > 1) {
      logger.error("Multiple matching access tokens found in session table, this shouldn't happen.");
      addMetric(MetricName.AccessTokenValidationFailure, 1, {
        [MetricDimension.Reason]: "multiple-token-matches",
      });
    } else {
      logger.error("Access token not found in session table.");
      addMetric(MetricName.AccessTokenValidationFailure, 1, {
        [MetricDimension.Reason]: "token-not-found",
      });
    }
  } catch (error) {
    logger.error("Unexpected error in API Gateway handler", { error });
    addMetric(MetricName.AccessTokenValidationFailure, 1, {
      [MetricDimension.Reason]: "exception",
    });
    throw new Error("Unexpected error", { cause: error });
  }
  throw new Error("Unauthorized");
};

export const lowerCaseHeaderKeys = function (
  eventHeaders: APIGatewayRequestAuthorizerEventHeaders
): APIGatewayRequestAuthorizerEventHeaders {
  const headers: APIGatewayRequestAuthorizerEventHeaders = {};
  for (const key of Object.keys(eventHeaders)) {
    headers[key.toLowerCase()] = eventHeaders[key];
  }
  return headers;
};

function addMetric(metricName: MetricName, value: number = 1, dimensions?: Dimensions) {
  if (dimensions) {
    metric.addDimensions(dimensions);
  }
  metric.addMetric(metricName, "Count", value);
  metric.publishStoredMetrics();
}

const generatePolicy = function (
  principalId: string,
  effect: StatementEffect,
  resource: string,
  subjectId?: string,
  storageToken?: string
): APIGatewayAuthorizerResult {
  if (effect && resource) {
    const statement: Statement = { Action: "execute-api:Invoke", Effect: effect, Resource: resource };
    const policyDocument: PolicyDocument = { Version: "2012-10-17", Statement: [statement] };
    logger.debug("Generating policy " + effect);
    const context = {
      subjectId,
      storageToken,
    };
    return { principalId, policyDocument, context };
  }

  throw new PolicyGenerationError("Missing effect and/or resource to generate policy.");
};

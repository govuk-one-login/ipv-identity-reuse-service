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

export const metric: Metrics = new Metrics();

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent,
  context: Context
): Promise<APIGatewayAuthorizerResult> => {
  logger.addContext(context);
  const headers: APIGatewayRequestAuthorizerEventHeaders = event.headers ? lowerCaseHeaderKeys(event.headers) : {};

  if (!headers["authorization"]) {
    logger.error("Authorization failed as no header present");
    addMetric("AccessTokenValidationFailure", 1, {
      reason: "header-not-present",
    });
    return generatePolicy("user", "Deny", event.methodArn);
  }

  if (!headers["authorization"]?.startsWith("Bearer ")) {
    logger.error("Authorization header is not a bearer token");
    addMetric("AccessTokenValidationFailure", 1, {
      reason: "not-a-bearer-token",
    });
    return generatePolicy("user", "Deny", event.methodArn);
  }

  try {
    const command = new QueryCommand({
      TableName: process.env.SESSION_TABLE_NAME,
      IndexName: "access-token-index-with-event-data",
      KeyConditionExpression: "accessToken = :tokenValue",
      ExpressionAttributeValues: {
        ":tokenValue": {
          S: headers["authorization"]?.slice(7),
        },
      },
    });
    const response = await documentClient.send(command);
    if (response.Items && response.Items.length == 1) {
      const retrievedRecord = unmarshall(response.Items[0]);
      const subjectId: string = retrievedRecord.subject;
      const storageToken: string = retrievedRecord.storageToken;

      const allowPolicy = generatePolicy(subjectId, "Allow", event.methodArn, subjectId, storageToken);
      addMetric("AccessTokenValidationSuccessful");
      return allowPolicy;
    } else if (response.Items && response.Items.length > 1) {
      logger.error("Multiple matching access tokens found in session table, this shouldn't happen.");
      addMetric("AccessTokenValidationFailure", 1, {
        reason: "multiple-token-matches",
      });
    } else {
      logger.error("Access token not found in session table.");
      addMetric("AccessTokenValidationFailure", 1, {
        reason: "token-not-found",
      });
    }
    return generatePolicy("anonymous", "Deny", event.methodArn);
  } catch (error) {
    logger.error("Unexpected error in API Gateway handler", { error });
    addMetric("AccessTokenValidationFailure", 1, {
      reason: "exception",
    });
    throw new Error("Unauthorized", { cause: error });
  }
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

function addMetric(metricName: string, value: number = 1, dimensions?: Dimensions) {
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
    if (subjectId && storageToken) {
      const context = { subjectId, storageToken };
      return { principalId, policyDocument, context };
    }
    return { principalId, policyDocument };
  }

  throw new PolicyGenerationError("Missing effect and/or resource to generate policy.");
};

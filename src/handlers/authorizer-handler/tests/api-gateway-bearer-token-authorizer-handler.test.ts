import { beforeEach, describe, expect, it, vi } from "vitest";
import { handler, metric } from "../api-gateway-bearer-token-authorizer-handler";
import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayRequestAuthorizerEvent, Context } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, QueryCommandOutput } from "@aws-sdk/lib-dynamodb";
import { AttributeValue, QueryCommand } from "@aws-sdk/client-dynamodb";

describe("api-gateway-bearer-token-authorizer-handler", () => {
  const metricSpy = vi.spyOn(metric, "addMetric");
  const metricDimensionSpy = vi.spyOn(metric, "addDimensions");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("return a allow policy", () => {
    it("should return an allow policy when bearer token is present and valid", async () => {
      const accessToken = "abcd1234";
      const subjectId = "urn:uuid:569faa50-71fe-4d12-b54f-9809483fec0c";
      const storageToken = "abcd.1234.xyz";
      const dynamodbDocumentMock = mockClient(DynamoDBDocumentClient);
      dynamodbDocumentMock.on(QueryCommand).resolves({
        Count: 1,
        Items: [
          createMockDynamoDatabaseSession({
            accessToken: {
              S: accessToken,
            },
            subject: {
              S: subjectId,
            },
            storageToken: {
              S: storageToken,
            },
          }),
        ],
        $metadata: {},
      });

      const event = createMockEvent({
        headers: {
          authorization: "Bearer abcd1234",
        },
      });

      const response = await handler(event, {} as Context);

      const policyStatement = response.policyDocument?.Statement[0];
      expect(policyStatement?.Effect).toBe("Allow");
      expect(response.principalId).toBe(subjectId);
      expect(response.context).toMatchObject({
        subjectId,
        storageToken,
      });
      expect(metricSpy).toHaveBeenCalledExactlyOnceWith("AccessTokenValidationSuccessful", "Count", 1);
      expect(metricDimensionSpy).not.toHaveBeenCalled();
    });
  });

  describe("return a deny policy", () => {
    it("should return deny policy when no authorisation header present", async () => {
      const event = createMockEvent({});

      const response = await handler(event, {} as Context);

      const policyStatement = response.policyDocument?.Statement[0];
      expect(policyStatement?.Effect).toBe("Deny");
      expect(metricSpy).toHaveBeenCalledExactlyOnceWith("AccessTokenValidationFailure", "Count", 1);
      expect(metricDimensionSpy).toHaveBeenCalledExactlyOnceWith({
        reason: "header-not-present",
      });
    });

    it("should return deny policy when authorisation header is not a bearer token", async () => {
      const event = createMockEvent({
        headers: {
          authorization: "token abcd1234",
        },
      });

      const response = await handler(event, {} as Context);

      const policyStatement = response.policyDocument?.Statement[0];
      expect(policyStatement?.Effect).toBe("Deny");
      expect(metricSpy).toHaveBeenCalledExactlyOnceWith("AccessTokenValidationFailure", "Count", 1);
      expect(metricDimensionSpy).toHaveBeenCalledExactlyOnceWith({
        reason: "not-a-bearer-token",
      });
    });

    it("should return deny policy when access token not found", async () => {
      const dynamodbDocumentMock = mockClient(DynamoDBDocumentClient);
      dynamodbDocumentMock.on(QueryCommand).resolves({
        Count: 0,
        Items: [],
        $metadata: {},
      } satisfies QueryCommandOutput);

      const event = createMockEvent({
        headers: {
          authorization: "Bearer abcd1234",
        },
      });

      const response = await handler(event, {} as Context);

      const policyStatement = response.policyDocument?.Statement[0];
      expect(policyStatement?.Effect).toBe("Deny");
      expect(metricSpy).toHaveBeenCalledExactlyOnceWith("AccessTokenValidationFailure", "Count", 1);
      expect(metricDimensionSpy).toHaveBeenCalledExactlyOnceWith({
        reason: "token-not-found",
      });
    });

    it("should return deny policy when multiple access token matches found", async () => {
      const dynamodbDocumentMock = mockClient(DynamoDBDocumentClient);
      dynamodbDocumentMock.on(QueryCommand).resolves({
        Count: 1,
        Items: [createMockDynamoDatabaseSession({}), createMockDynamoDatabaseSession({})],
        $metadata: {},
      });

      const event = createMockEvent({
        headers: {
          authorization: "Bearer abcd1234",
        },
      });

      const response = await handler(event, {} as Context);

      const policyStatement = response.policyDocument?.Statement[0];
      expect(policyStatement?.Effect).toBe("Deny");
      expect(metricSpy).toHaveBeenCalledExactlyOnceWith("AccessTokenValidationFailure", "Count", 1);
      expect(metricDimensionSpy).toHaveBeenCalledExactlyOnceWith({
        reason: "multiple-token-matches",
      });
    });
  });

  describe("unexpected exceptions", async () => {
    it("should throw if Dynamo throws exception", async () => {
      const dynamodbDocumentMock = mockClient(DynamoDBDocumentClient);
      dynamodbDocumentMock.on(QueryCommand).rejects({
        message: "Bad Request",
      });

      const event = createMockEvent({
        headers: {
          authorization: "Bearer abcd1234",
        },
      });

      await expect(handler(event, {} as Context)).rejects.toThrow("Unauthorized");

      expect(metricSpy).toHaveBeenCalledExactlyOnceWith("AccessTokenValidationFailure", "Count", 1);
      expect(metricDimensionSpy).toHaveBeenCalledExactlyOnceWith({
        reason: "exception",
      });
    });
  });
});

function createMockEvent(overrides: Partial<APIGatewayRequestAuthorizerEvent>): APIGatewayRequestAuthorizerEvent {
  return {
    type: "REQUEST",
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    path: "/",
    requestContext: {} as APIGatewayEventRequestContextWithAuthorizer<never>,
    resource: "/",
    pathParameters: {},
    stageVariables: {},
    methodArn: "arn:aws::a-dummy-method",
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    ...overrides,
  };
}

function createMockDynamoDatabaseSession(
  overrides: Partial<Record<string, AttributeValue>>
): Record<string, AttributeValue> {
  return {
    sessionId: {
      S: "d100afe6-0c80-4388-b1c9-a7e149ac878e",
    },
    attemptCount: {
      N: "0",
    },
    clientId: {
      S: "client-id",
    },
    clientIpAddress: {
      S: "1.2.3.4",
    },
    clientSessionId: {
      S: "fba428d2-2454-41f1-a316-7855b9ec6341",
    },
    createdDate: {
      N: "1784821199580",
    },
    expiryDate: {
      N: "1784828399",
    },
    redirectUri: {
      S: "https://example.com/callback",
    },
    state: {
      S: "sample-state",
    },
    ...overrides,
  };
}

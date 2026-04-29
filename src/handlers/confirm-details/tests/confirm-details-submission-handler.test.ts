import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent } from "aws-lambda";
import { expect, it } from "vitest";
import { lambdaHandler } from "../confirm-details-submission-handler";

it("should return a 302 status code on a successful request", async () => {
  const event = createMockAPIGatewayProxyEvent({});

  const response = await lambdaHandler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api.example.com/?code=abc123&state=test-state-id",
    },
  });
});

const createMockAPIGatewayProxyEvent = (event: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent => ({
  body: "redirectUri=https%3A%2F%2Fapi.example.com&code=abc123&state=test-state-id",
  headers: {},
  multiValueHeaders: {},
  httpMethod: "POST",
  isBase64Encoded: false,
  path: "/",
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {} as APIGatewayEventRequestContextWithAuthorizer<never>,
  resource: "/",
  ...event,
});

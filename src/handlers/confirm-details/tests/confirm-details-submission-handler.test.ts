import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent } from "aws-lambda";
import { expect, it } from "vitest";
import { lambdaHandler } from "../confirm-details-submission-handler";

it("should return a 302 status code on a successful request", async () => {
  const event = createMockAPIGatewayProxyEvent(
    {},
    "redirectUri=https%3A%2F%2Fapi.example.com&code=abc123&state=test-state-id"
  );

  const response = await lambdaHandler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api.example.com/?code=abc123&state=test-state-id",
    },
  });
});

it("should return an error when some query string parameters are missing", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "redirectUri=https%3A%2F%2Fapi.example.com");
  await expect(lambdaHandler(event)).rejects.toMatchObject({
    message: "One or more required query string parameters are undefined",
  });

  const event2 = createMockAPIGatewayProxyEvent({}, "code=abc123&state=test-state-id");
  await expect(lambdaHandler(event2)).rejects.toMatchObject({
    message: "One or more required query string parameters are undefined",
  });
});

const createMockAPIGatewayProxyEvent = (event: Partial<APIGatewayProxyEvent>, body: string): APIGatewayProxyEvent => ({
  body: body,
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

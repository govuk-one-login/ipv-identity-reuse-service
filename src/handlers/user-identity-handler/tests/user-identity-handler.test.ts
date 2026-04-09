import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../user-identity-handler";
import { expect, it } from "vitest";

it("should return an empty response", async () => {
  const request = createMockAPIGatewayProxyEvent();
  const response = await handler(request, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 200,
    body: "{}",
  });
});

const createMockAPIGatewayProxyEvent = (event?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent => ({
  body: null,
  headers: {},
  multiValueHeaders: {},
  httpMethod: "GET",
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

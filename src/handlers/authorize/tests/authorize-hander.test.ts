import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent, Context } from "aws-lambda";
import { expect, it } from "vitest";
import { AuthorizationQueryStringParameters, handler } from "../authorize-handler";

it("should return 302 status code on a successful request", async () => {
  const event = createMockAPIGatewayProxyEvent({
    queryStringParameters: {
      client_id: "sample",
      response_type: "code",
      redirect_uri: "https://api.example.com/callback",
    } satisfies AuthorizationQueryStringParameters,
  });

  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api.example.com/callback?code=SplxlOBeZQQYbYS6WxSbIA",
    },
  });
});

it("should return 302 status code on a successful request and handle URL encoded redirect_uri", async () => {
  const event = createMockAPIGatewayProxyEvent({
    queryStringParameters: {
      client_id: "sample",
      response_type: "code",
      redirect_uri: "https%3A%2F%2Fapi.example.com%2Fcallback",
    } satisfies AuthorizationQueryStringParameters,
  });

  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api.example.com/callback?code=SplxlOBeZQQYbYS6WxSbIA",
    },
  });
});

it("should return 302 status code on a successful request and include the scope", async () => {
  const event = createMockAPIGatewayProxyEvent({
    queryStringParameters: {
      client_id: "sample",
      response_type: "code",
      redirect_uri: "https://api.example.com/callback",
      scope: "example-scope",
    } satisfies AuthorizationQueryStringParameters,
  });

  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api.example.com/callback?code=SplxlOBeZQQYbYS6WxSbIA&scope=example-scope",
    },
  });
});

it("should reject if the response_type is not code", async () => {
  const event = createMockAPIGatewayProxyEvent({
    queryStringParameters: {
      client_id: "sample",
      response_type: "raw",
      redirect_uri: "https://api.example.com/callback",
    } satisfies AuthorizationQueryStringParameters,
  });

  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 400,
    body: '{"message":"Request parameter [response_type] must be of type \'code\'"}',
  });
});

const createMockAPIGatewayProxyEvent = (event: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent => ({
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

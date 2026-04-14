import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent, Context } from "aws-lambda";
import { expect, it } from "vitest";
import { handler } from "../token-handler";

it("should return an error if the content-type is not application/x-www-form-urlencoded", async () => {
  const event = createMockAPIGatewayProxyEvent({
    headers: {
      "content-type": "application/json",
    },
  });
  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 400,
    body: '{"error":"invalid_request","error_description":"\'content-type\' is \'application/json\' but should be \'application/x-www-form-urlencoded\'"}',
  });
});

it("should return an error if the content-type is unknown", async () => {
  const event = createMockAPIGatewayProxyEvent({
    headers: {},
  });
  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 400,
    body: '{"error":"invalid_request","error_description":"\'content-type\' is \'undefined\' but should be \'application/x-www-form-urlencoded\'"}',
  });
});

it("should return an error if the grant_type is not authorization_code", async () => {
  const event = createMockAPIGatewayProxyEvent({
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
  });
  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 400,
    body: '{"error":"invalid_grant","error_description":"\'grant_type\' is not supported, must be [authorization_code]"}',
  });
});

it("should return an error if the code is missing", async () => {
  const event = createMockAPIGatewayProxyEvent({
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=authorization_code",
  });
  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 400,
    body: '{"error":"invalid_grant","error_description":"missing field [code]"}',
  });
});

it("should return an error if the code is too short", async () => {
  const event = createMockAPIGatewayProxyEvent({
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=authorization_code&code=",
  });
  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 400,
    body: '{"error":"invalid_grant","error_description":"missing field [code]"}',
  });
});

it("should return return a valid token", async () => {
  const event = createMockAPIGatewayProxyEvent({
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA",
  });
  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 200,
    body: '{"access_token":"a35b81a7d7927b70ec99270dd2362b88580a28574af812f2c02f56469579186f","token_type":"Bearer","expires_in":0}',
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

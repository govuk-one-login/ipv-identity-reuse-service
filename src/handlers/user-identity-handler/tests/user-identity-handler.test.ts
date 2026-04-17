import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../user-identity-handler";
import { expect, it } from "vitest";

it("should return an empty response", async () => {
  const request = createMockAPIGatewayProxyEvent();
  const response = await handler(request, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 200,
    body: JSON.stringify({
      sub: "urn:fdc:gov.uk:2022:TEST_USER-7B96ScRg2a-k7fN-u-sZbEjbB3hQ6gf6SM0x",
      iss: "http://api.example.com",
      credentials: ["sample-credential-id"],
      vot: "P2",
      vtm: "https://oidc.account.gov.uk/trustmark",
    }),
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

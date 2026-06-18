import { describe, expect, it, vitest } from "vitest";
import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent } from "aws-lambda";
import { getCookieValues } from "../cookie-utilities";

describe("cookie-utilities", () => {
  it("should return all cookie values", async () => {
    const event = createMockAPIGatewayProxyEvent({}, "");
    const mapOfCookies = getCookieValues(event);
    expect(mapOfCookies).length(2);
    expect(mapOfCookies!.get("test_cookie_one")).toBe("abc123");
    expect(mapOfCookies!.get("test_cookie_two")).toBe("xyz246");
  });

  it("should return the specific value for the provided cookie name", async () => {
    const event = createMockAPIGatewayProxyEvent({}, "");
    const mapOfCookies = getCookieValues(event);
    expect(mapOfCookies).length(2);
    expect(mapOfCookies!.get("test_cookie_one")).toBe("abc123");
  });

  it("should return undefined when an error is thrown", async () => {
    const decodeSpy = vitest.spyOn(globalThis, "decodeURIComponent").mockImplementation(() => {
      throw new URIError("URI malformed");
    });
    const event = createMockAPIGatewayProxyEvent({}, "");
    const mapOfCookies = getCookieValues(event);
    expect(decodeSpy).toHaveBeenCalled();
    expect(mapOfCookies).toBe(undefined);
  });
});

const createMockAPIGatewayProxyEvent = (event: Partial<APIGatewayProxyEvent>, body: string): APIGatewayProxyEvent => ({
  body: body,
  headers: { Cookie: "test_cookie_one=abc123;test_cookie_two=xyz246" },
  multiValueHeaders: {},
  httpMethod: "POST",
  isBase64Encoded: false,
  path: "/",
  // eslint-disable-next-line unicorn/no-null -- Required to create valid APIGatewayProxyEvent
  pathParameters: null,
  queryStringParameters: { redirect_uri: "https://api.example.com", state: "test-state", client_id: "test-client-id" },
  // eslint-disable-next-line unicorn/no-null -- Required to create valid APIGatewayProxyEvent
  multiValueQueryStringParameters: null,
  // eslint-disable-next-line unicorn/no-null -- Required to create valid APIGatewayProxyEvent
  stageVariables: null,
  requestContext: {} as APIGatewayEventRequestContextWithAuthorizer<never>,
  resource: "/",
  ...event,
});

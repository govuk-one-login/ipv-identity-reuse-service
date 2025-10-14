import express, { type Request } from "express";
import type { Server } from "http";
import { handler } from "../../../src/handlers/user-identity/user-identity-handler";
import {
  APIGatewayEventRequestContextWithAuthorizer,
  APIGatewayProxyEvent,
  APIGatewayProxyEventHeaders,
  Context,
} from "aws-lambda";
import { middleware as OpenApiValidatorMiddleware } from "express-openapi-validator";
import path from "path";

const TEST_VALID_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6ImVjS2lkMTIzIn0.eyJzdWIiOiJ1cm46ZmRjOmdvdi51azoyMDIyOlRFU1RfVVNFUi1TN2pjckhMR0JqLTJrZ0ItOC1jWWhWck1kbzNDVjBMbEQ3QW4iLCJleHAiOjE3NTczMjQyMTcsImlhdCI6MTc1NzMyMzkxNywiaXNzIjoiaHR0cHM6Ly9tb2NrLmNyZWRlbnRpYWwtc3RvcmUuYnVpbGQuYWNjb3VudC5nb3YudWsvb3JjaGVzdHJhdGlvbiIsImF1ZCI6Imh0dHBzOi8vY3JlZGVudGlhbC1zdG9yZS5idWlsZC5hY2NvdW50Lmdvdi51ayIsInNjb3BlIjoicHJvdmluZyJ9.Sj-2jA6mLdfkU1ryoBCNHxpBCT49o9qfqpKPMLkKwY1D6V6SvVIERGbC0X-fh8SYk2z-strc9vahvacvkrNDUQ"; // pragma: allowlist secret

export const createServer = (port: number): Server => {
  return express()
    .use(express.json())
    .use(
      OpenApiValidatorMiddleware({
        apiSpec: path.resolve(__dirname, "../../../openAPI/api.yaml"),
        validateRequests: true,
      })
    )
    .post("/user-identity", async (request, response, next) => {
      const headerOverrides: Record<string, string> = {};

      if (/test-access-token/.test(request.header("authorization") || "")) {
        headerOverrides["authorization"] = `Bearer ${TEST_VALID_TOKEN}`;
      } else if (/test-expired-access-token/.test(request.header("authorization") || "")) {
        response.status(403).json({ message: "Unauthorised" });
      }
      const apiGatewayRequest = expressRequestToAPIGateway(request, { headerOverrides });
      const result = await handler(apiGatewayRequest, {} as Context);

      response.status(result.statusCode).json(JSON.parse(result.body));

      next();
    })
    .listen(port);
};

export const expressRequestToAPIGateway = (
  request: Request,
  options?: {
    headerOverrides?: Record<string, string>;
  }
): APIGatewayProxyEvent => ({
  body: JSON.stringify(request.body),
  headers: { ...(request.headers as never as APIGatewayProxyEventHeaders), ...options?.headerOverrides },
  multiValueHeaders: {},
  httpMethod: "POST",
  isBase64Encoded: false,
  path: request.path,
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {} as APIGatewayEventRequestContextWithAuthorizer<never>,
  resource: "",
});

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../commons/logger";
import { URLSearchParams } from "node:url";
import { createHash } from "node:crypto";

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  if (!event.headers["content-type"] || event.headers["content-type"] !== "application/x-www-form-urlencoded") {
    logger.error(
      `'content-type' is '${event.headers["content-type"]}' but should be 'application/x-www-form-urlencoded'`
    );
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_request",
        error_description: `'content-type' is '${event.headers["content-type"]}' but should be 'application/x-www-form-urlencoded'`,
      }),
    };
  }

  const searchParams = new URLSearchParams(event.body || "");
  if (searchParams.get("grant_type") !== "authorization_code") {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_grant",
        error_description: "'grant_type' is not supported, must be [authorization_code]",
      }),
    };
  }

  const code = searchParams.get("code");
  if (!code || code.length <= 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "invalid_grant",
        error_description: `missing field [code]`,
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      access_token: createHash("sha256").update(code).digest("hex"),
      token_type: "Bearer",
      expires_in: 0,
    }),
  };
};

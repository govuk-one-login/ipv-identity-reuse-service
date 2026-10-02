import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../commons/logger.js";
import { getCookieValues } from "../../commons/cookie-utilities.js";
import { redirectToErrorPage } from "../../api/sis-api.js";
import { createAuthCode } from "../../api/oauth-internal-api.js";

export const lambdaHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  const domainName = process.env.DOMAIN_NAME;
  const sessionId = getCookieValues(event)?.get("identity_reuse_service_session");
  if (!sessionId) {
    logger.error("Session ID parameter is missing");
    return redirectToErrorPage(domainName);
  }

  try {
    await createAuthCode(sessionId);

    return {
      statusCode: 302,
      body: "",
      headers: {
        Location: `https://${process.env.PUBLIC_API}/oauth2/callback`,
      },
    };
  } catch (error) {
    logger.error(`Error in lambdaHandler event`, { error });
    return redirectToErrorPage(domainName);
  }
};

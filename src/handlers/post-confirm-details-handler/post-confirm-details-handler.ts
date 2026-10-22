import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { createAuthCode, updateSessionData } from "../../api/oauth-internal-api.js";
import { redirectToErrorPage, redirectToSessionExpiredPage } from "../../api/sis-api.js";
import { getCookieValues } from "../../utilities/cookie-utilities.js";
import { SessionInvalidError } from "../../utilities/errors.js";
import logger from "../../utilities/logger.js";

export const lambdaHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const eventValues = new URLSearchParams(event.body || "");
  const action = eventValues.get("action");
  const domainName = process.env.DOMAIN_NAME || "";

  logger.addContext(context);

  const sessionId = getCookieValues(event)?.get("identity_reuse_service_session");
  if (!sessionId) {
    logger.error("Session ID parameter is missing");
    return redirectToSessionExpiredPage(domainName);
  }

  try {
    // eslint-disable-next-line unicorn/prefer-ternary
    if (action === "update-details") {
      await updateSessionData(sessionId, { errorDescription: "record_update_requested" });
    } else {
      await createAuthCode(sessionId);
    }

    return {
      statusCode: 302,
      body: "",
      headers: {
        Location: `https://${process.env.PUBLIC_API}/oauth2/callback`,
      },
    };
  } catch (error) {
    logger.error(`Error in lambdaHandler event`, { error });
    if (error instanceof SessionInvalidError) {
      return redirectToSessionExpiredPage(domainName);
    }
    return redirectToErrorPage(domainName);
  }
};

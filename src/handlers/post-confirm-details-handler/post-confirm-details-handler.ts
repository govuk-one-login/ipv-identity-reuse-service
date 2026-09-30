import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { createAuthCode, updateSessionData } from "../../api/oauth-internal-api.js";
import { redirectToErrorPage } from "../../api/sis-api.js";
import { getCookieValues } from "../../commons/cookie-utilities.js";
import logger from "../../commons/logger.js";

export const lambdaHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const eventValues = new URLSearchParams(event.body || "");
  const action = eventValues.get("action");
  const domainName = process.env.DOMAIN_NAME || "";

  logger.addContext(context);

  const sessionId = getCookieValues(event)?.get("identity_reuse_service_session");
  if (!sessionId) {
    logger.error("Session ID parameter is missing");
    return redirectToErrorPage(domainName);
  }

  try {
    await createAuthCode(sessionId);
    if (action === "update-details") {
      await updateSessionData(sessionId, { errorDescription: "record_update_requested" });
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
    return redirectToErrorPage(domainName);
  }
};

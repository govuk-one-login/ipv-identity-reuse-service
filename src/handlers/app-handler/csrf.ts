import { csrfSync } from "csrf-sync";
import { Request, RequestHandler } from "express";
import { redirectToBadRequestExpress } from "../../api/sis-api.js";
import logger from "../../utilities/logger.js";

const {
  getTokenFromRequest,
  generateToken,
  storeTokenInState,
  csrfSynchronisedProtection: csrfSynchronisedProtectionOriginal,
} = csrfSync({
  getTokenFromRequest: (request: Request) => {
    if (!request.body) {
      throw new Error("Missing request body");
    }

    return request.body["_csrf"];
  },
});

const csrfSynchronisedProtection: RequestHandler = (request, response, next) => {
  csrfSynchronisedProtectionOriginal(request, response, (error?: unknown): void => {
    if (!error) {
      return next();
    }

    if (typeof error == "object" && "message" in error) {
      logger.error("CSRF protection returned an error", { error: error.message });
    } else {
      logger.error("CSRF protection returned an error", { err: error });
    }

    return redirectToBadRequestExpress(response);
  });
};

export { csrfSynchronisedProtection, getTokenFromRequest, generateToken, storeTokenInState };

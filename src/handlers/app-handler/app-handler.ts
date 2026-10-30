import { configure } from "@codegenie/serverless-express";
import express from "express";
import { loggerMiddleware } from "./logger-middleware.js";
import { handler as getConfirmDetailsHandler } from "./get-confirm-details-handler/get-confirm-details-handler.js";
import { handler as postConfirmDetailsHandler } from "./post-confirm-details-handler/post-confirm-details-handler.js";
import { handler as getUnrecoverableHandler } from "./get-unrecoverable-error-handler/get-unrecoverable-error-handler.js";
import { handler as getSessionExpiredHandler } from "./get-session-expired-handler/get-session-expired-handler.js";
import { handler as getAuthorizeHandler } from "./get-authorize-handler/get-authorize-handler.js";
import { handler as getCallbackHandler } from "./get-callback-handler/get-callback-handler.js";
import logger from "../../utilities/logger.js";
import cookieParser from "cookie-parser";
import path from "node:path";
import nunjucks from "nunjucks";

// Configure Express.js
const app = express()
  .disable("x-powered-by")
  .set("view engine", "njk")
  .use(cookieParser())
  .use(express.urlencoded({ extended: true }))
  .use(loggerMiddleware)
  .get("/confirm-details", getConfirmDetailsHandler)
  .post("/confirm-details", postConfirmDetailsHandler)
  .get("/error/session-expired", getSessionExpiredHandler)
  .get("/error/:error", getUnrecoverableHandler)
  .get("/oauth2/authorize", getAuthorizeHandler)
  .get("/oauth2/callback", getCallbackHandler);

// Configure nunjucks
const govukFrontendDistribution = path.join(path.dirname(require.resolve("govuk-frontend/package.json")), "dist");
nunjucks
  .configure(
    [process.env.LAMBDA_TASK_ROOT || "", govukFrontendDistribution, path.join(govukFrontendDistribution, "../..")],
    { express: app }
  )
  .addFilter("GDSDate", (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  });

export const handler = configure({
  app,
  log: {
    info: (message, ...additional) => {
      logger.info(message, { additional });
    },
    warn: (message, ...additional) => {
      logger.warn(message, { additional });
    },
    error: (message, ...additional) => {
      logger.error(message, { additional });
    },
    debug: (message, ...additional) => {
      logger.debug(message, { additional });
    },
    verbose: (message, ...additional) => {
      logger.info(message, { additional });
    },
  },
});

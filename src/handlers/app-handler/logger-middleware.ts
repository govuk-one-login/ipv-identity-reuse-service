import { RequestHandler } from "express";
import logger from "../../utilities/logger.js";
import { getCurrentInvoke } from "@codegenie/serverless-express";

export const loggerMiddleware: RequestHandler = (request, response, next) => {
  const { context } = getCurrentInvoke();

  logger.addContext(context);
  logger.appendKeys({ method: request.method, path: request.path });

  logger.info(`Incoming request: ${request.method} ${request.path}`, {
    method: request.method,
    path: request.path,
  });

  response.on("finish", () => {
    logger.info(`Request processed: ${request.method} ${request.path}`, {
      statusCode: response.statusCode,
    });
  });

  response.on("error", (error) => {
    logger.error(`Error occurred: ${error.message}`, { error });
  });

  next();
};

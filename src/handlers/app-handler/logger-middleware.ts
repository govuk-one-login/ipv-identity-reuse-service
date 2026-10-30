import { RequestHandler } from "express";
import logger from "../../utilities/logger.js";
import { getCurrentInvoke } from "@codegenie/serverless-express";

export const loggerMiddleware: RequestHandler = (request, response, next) => {
  const { context } = getCurrentInvoke();

  logger.addContext(context);

  logger.info(`Incoming request 2: ${request.method} ${request.path}`, {
    method: request.method,
    path: request.path,
    query: request.query,
    req: request,
  });

  response.on("finish", () => {
    logger.info(`Request processed: ${request.method} ${request.path}`, {
      statusCode: response.statusCode,
    });
  });

  next();
};

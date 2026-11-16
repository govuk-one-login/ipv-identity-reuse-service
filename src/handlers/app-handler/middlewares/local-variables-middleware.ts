import { randomBytes } from "node:crypto";
import { RequestHandler } from "express";

export const setLocalVariablesMiddleware: RequestHandler = (request, response, next) => {
  response.locals = response.locals ?? {};
  response.locals.cspNonce = randomBytes(16).toString("base64");
  next();
};

import mainPageTemplate from "./index.njk";
import translations from "../../../../locales/en/translation.json" with { type: "json" };

import { RequestHandler } from "express";

export const handler: RequestHandler = async (request, response) =>
  response.header("content-type", "text/html").status(500).render(mainPageTemplate, {
    assetPath: "./assets",
    baseUrl: request.path,
    rootPath: "",
    govukRebrand: true,
    translations,
  });

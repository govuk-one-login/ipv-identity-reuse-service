import mainPageTemplate from "./get-unrecoverable-error-page.njk";
import translations from "../../../../locales/en/translation.json" with { type: "json" };
import basePageTemplate from "../base.njk";

import { RequestHandler } from "express";

export const handler: RequestHandler = (request, response) =>
  response.header("content-type", "text/html").status(500).render(mainPageTemplate, {
    assetPath: "./assets",
    baseUrl: "/",
    rootPath: "",
    govukRebrand: true,
    translations,
    basePageTemplate,
  });
